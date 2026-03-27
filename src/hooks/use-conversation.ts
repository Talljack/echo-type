'use client';

import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTTS } from '@/hooks/use-tts';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { IS_TAURI } from '@/lib/tauri';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useSpeakStore } from '@/stores/speak-store';
import { useTTSStore } from '@/stores/tts-store';

interface UseConversationOptions {
  /** Scenario info sent to API; omit for free conversation */
  scenario?: {
    title: string;
    systemPrompt: string;
    goals: string[];
    difficulty: string;
  };
  /** Opening message from AI when conversation starts */
  openingMessage?: string;
  /** Topic hint prepended to first user message for free mode */
  topicHint?: string;
}

export function useConversation({ scenario, openingMessage, topicHint }: UseConversationOptions = {}) {
  const [textInput, setTextInput] = useState('');
  const [isFallbackTranscribing, setIsFallbackTranscribing] = useState(false);

  // Determine if native speech recognition is available (client-side only)
  const useNative = useRef(
    typeof window !== 'undefined' && !IS_TAURI && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );

  const messages = useSpeakStore((s) => s.messages);
  const isStreaming = useSpeakStore((s) => s.isStreaming);
  const isRecording = useSpeakStore((s) => s.isRecording);
  const addMessage = useSpeakStore((s) => s.addMessage);
  const updateLastMessage = useSpeakStore((s) => s.updateLastMessage);
  const setIsStreaming = useSpeakStore((s) => s.setIsStreaming);
  const setIsRecording = useSpeakStore((s) => s.setIsRecording);
  const resetConversation = useSpeakStore((s) => s.resetConversation);
  const toggleMessageTranslation = useSpeakStore((s) => s.toggleMessageTranslation);
  const setMessageTranslation = useSpeakStore((s) => s.setMessageTranslation);
  const setMessageTranslating = useSpeakStore((s) => s.setMessageTranslating);
  const setMessagePlaying = useSpeakStore((s) => s.setMessagePlaying);
  const clearAllPlaying = useSpeakStore((s) => s.clearAllPlaying);

  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const activeConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];

  const targetLang = useTTSStore((s) => s.targetLang);
  const hydrateTTS = useTTSStore((s) => s.hydrate);
  const { speak, stop } = useTTS();

  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);
  const sendToAIRef = useRef<(msgs: { role: string; content: string }[]) => void>(() => {});
  const getTranscriptRef = useRef<() => { transcript: string; interimTranscript: string }>(() => ({
    transcript: '',
    interimTranscript: '',
  }));
  const topicHintRef = useRef(topicHint);
  topicHintRef.current = topicHint;

  // Helper: finalize a recording message and send to AI
  const finalizeRecording = useCallback((finalText: string) => {
    if (!finalText.trim()) {
      useSpeakStore.setState({
        messages: useSpeakStore.getState().messages.filter((m) => m.role !== 'recording'),
      });
      return;
    }

    const currentMessages = useSpeakStore.getState().messages;
    const updatedMessages = currentMessages.map((m) =>
      m.role === 'recording' ? { ...m, role: 'user' as const, content: finalText.trim() } : m,
    );
    useSpeakStore.setState({ messages: updatedMessages });

    const apiMessages = updatedMessages
      .filter((m) => m.role !== 'recording')
      .map((m) => ({ role: m.role, content: m.content }));
    sendToAIRef.current(apiMessages);
  }, []);

  const sendToAI = useCallback(
    async (allMessages: { role: string; content: string }[]) => {
      if (
        !activeConfig ||
        (!activeConfig.auth.apiKey && !activeConfig.auth.accessToken && activeProviderId !== 'ollama')
      ) {
        const errorMsg = {
          id: nanoid(),
          role: 'assistant' as const,
          content:
            '⚠️ Please configure an API provider in Settings before starting a conversation. Go to Settings > Providers to set up OpenAI, Ollama, or another provider.',
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
        return;
      }

      setIsStreaming(true);

      const assistantMsg = { id: nanoid(), role: 'assistant' as const, content: '', timestamp: Date.now() };
      addMessage(assistantMsg);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeConfig.auth.apiKey) {
        headers[providerDef.headerKey] = activeConfig.auth.apiKey;
      } else if (activeConfig.auth.accessToken) {
        headers[providerDef.headerKey] = activeConfig.auth.accessToken;
      }

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers,
          signal: abortRef.current.signal,
          body: JSON.stringify({
            messages: allMessages,
            ...(scenario ? { scenario } : {}),
            provider: activeProviderId,
            providerConfigs: providers,
          }),
        });

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => 'Unknown error');
          throw new Error(errorText || 'Failed to fetch');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          updateLastMessage(fullText);
        }

        if (fullText) {
          void speak(fullText);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
        updateLastMessage(`❌ Error: ${errorMessage}. Please check your provider configuration in Settings.`);
      } finally {
        setIsStreaming(false);
      }
    },
    [
      scenario,
      activeProviderId,
      activeConfig,
      providerDef,
      addMessage,
      updateLastMessage,
      setIsStreaming,
      providers,
      speak,
    ],
  );

  sendToAIRef.current = sendToAI;

  // Hydrate TTS settings from localStorage
  useEffect(() => {
    hydrateTTS();
  }, [hydrateTTS]);

  // Init opening message
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    resetConversation();

    if (openingMessage) {
      addMessage({
        id: nanoid(),
        role: 'assistant',
        content: openingMessage,
        timestamp: Date.now(),
      });
    }
  }, [openingMessage, resetConversation, addMessage]);

  // --- Native voice recognition (Web Speech API) ---
  const handleVoiceResult = useCallback((text: string) => {
    const currentMessages = useSpeakStore.getState().messages;
    const recordingMsg = currentMessages.find((m) => m.role === 'recording');
    if (recordingMsg && text) {
      useSpeakStore.setState({
        messages: currentMessages.map((m) => (m.role === 'recording' ? { ...m, content: text } : m)),
      });
    }
  }, []);

  const handleVoiceEnd = useCallback(() => {
    const hasRecording = useSpeakStore.getState().messages.some((m) => m.role === 'recording');
    if (!hasRecording) return;

    setIsRecording(false);

    const current = getTranscriptRef.current();
    const refText = current.transcript || current.interimTranscript;
    const recordingMsg = useSpeakStore.getState().messages.find((m) => m.role === 'recording');
    const finalText = refText || recordingMsg?.content || '';

    finalizeRecording(finalText);
  }, [setIsRecording, finalizeRecording]);

  const { isSupported, startListening, stopListening, transcript, interimTranscript, getTranscript } =
    useVoiceRecognition({
      onResult: handleVoiceResult,
      onEnd: handleVoiceEnd,
    });

  getTranscriptRef.current = getTranscript;

  useEffect(() => {
    if (!isRecording) return;
    const currentMessages = useSpeakStore.getState().messages;
    const recordingMsg = currentMessages.find((m) => m.role === 'recording');
    if (recordingMsg) {
      const displayText = transcript || interimTranscript || '';
      if (displayText && displayText !== recordingMsg.content) {
        useSpeakStore.setState({
          messages: currentMessages.map((m) => (m.role === 'recording' ? { ...m, content: displayText } : m)),
        });
      }
    }
  }, [transcript, interimTranscript, isRecording]);

  // --- Fallback STT (MediaRecorder + Whisper API, for Tauri / unsupported browsers) ---
  const fallbackSTT = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback(
      (text: string) => {
        setIsFallbackTranscribing(false);
        setIsRecording(false);
        finalizeRecording(text);
      },
      [finalizeRecording, setIsRecording],
    ),
    onInterimTranscript: useCallback((text: string) => {
      const currentMessages = useSpeakStore.getState().messages;
      const recordingMsg = currentMessages.find((m) => m.role === 'recording');
      if (recordingMsg && text) {
        useSpeakStore.setState({
          messages: currentMessages.map((m) => (m.role === 'recording' ? { ...m, content: text } : m)),
        });
      }
    }, []),
    onError: useCallback(
      (error: string) => {
        setIsFallbackTranscribing(false);
        setIsRecording(false);
        // Remove recording message and show error
        useSpeakStore.setState({
          messages: useSpeakStore.getState().messages.filter((m) => m.role !== 'recording'),
        });
        addMessage({
          id: nanoid(),
          role: 'assistant',
          content: `⚠️ ${error}`,
          timestamp: Date.now(),
        });
      },
      [setIsRecording, addMessage],
    ),
  });

  const handlePlayVoice = useCallback(
    (text: string, messageId: string) => {
      const msg = useSpeakStore.getState().messages.find((m) => m.id === messageId);
      if (msg?.isPlaying) {
        stop();
        clearAllPlaying();
        return;
      }

      stop();
      clearAllPlaying();
      setMessagePlaying(messageId, true);

      void Promise.resolve(speak(text)).finally(() => {
        setMessagePlaying(messageId, false);
      });
    },
    [stop, clearAllPlaying, setMessagePlaying, speak],
  );

  const handleToggleTranslation = useCallback(
    async (messageId: string) => {
      const message = useSpeakStore.getState().messages.find((m) => m.id === messageId);
      if (!message) return;

      toggleMessageTranslation(messageId);

      if (!message.translationEnabled && !message.translation) {
        setMessageTranslating(messageId, true);
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (activeConfig?.auth.apiKey) {
            headers[providerDef.headerKey] = activeConfig.auth.apiKey;
          } else if (activeConfig?.auth.accessToken) {
            headers[providerDef.headerKey] = activeConfig.auth.accessToken;
          }

          const res = await fetch('/api/translate', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              text: message.content,
              targetLang,
              provider: activeProviderId,
              providerConfigs: providers,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setMessageTranslation(messageId, null, data.error || 'Translation failed');
          } else {
            setMessageTranslation(messageId, data.translation || null);
          }
        } catch {
          setMessageTranslation(messageId, null, 'Network error');
        }
      }
    },
    [
      toggleMessageTranslation,
      setMessageTranslating,
      setMessageTranslation,
      targetLang,
      activeProviderId,
      activeConfig,
      providerDef,
      providers,
    ],
  );

  const handleToggleRecording = useCallback(() => {
    if (isStreaming || isFallbackTranscribing) return;

    if (isRecording) {
      // Stop recording
      if (useNative.current) {
        stopListening();
      } else {
        fallbackSTT.stopRecording();
        setIsFallbackTranscribing(true);
      }
    } else {
      // Start recording
      stop();
      setIsRecording(true);
      addMessage({
        id: nanoid(),
        role: 'recording',
        content: '',
        timestamp: Date.now(),
      });
      if (useNative.current) {
        startListening();
      } else {
        void fallbackSTT.startRecording();
      }
    }
  }, [
    isRecording,
    isStreaming,
    isFallbackTranscribing,
    stopListening,
    startListening,
    setIsRecording,
    addMessage,
    stop,
    fallbackSTT,
  ]);

  const handleReplayLastAssistant = useCallback(() => {
    const lastAssistantMessage = [...useSpeakStore.getState().messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.content.trim());

    if (!lastAssistantMessage) return;
    handlePlayVoice(lastAssistantMessage.content, lastAssistantMessage.id);
  }, [handlePlayVoice]);

  const handleResetConversation = useCallback(() => {
    abortRef.current?.abort();
    if (useNative.current) {
      stopListening();
    } else {
      fallbackSTT.stopRecording();
    }
    stop();
    clearAllPlaying();
    setIsStreaming(false);
    setIsRecording(false);
    setIsFallbackTranscribing(false);
    resetConversation();

    if (openingMessage) {
      addMessage({
        id: nanoid(),
        role: 'assistant',
        content: openingMessage,
        timestamp: Date.now(),
      });
    }
  }, [
    addMessage,
    clearAllPlaying,
    openingMessage,
    resetConversation,
    setIsRecording,
    setIsStreaming,
    stop,
    stopListening,
    fallbackSTT,
  ]);

  useEffect(() => {
    function handleGlobalStop() {
      clearAllPlaying();
    }

    window.addEventListener('echotype:stop-tts', handleGlobalStop);
    return () => window.removeEventListener('echotype:stop-tts', handleGlobalStop);
  }, [clearAllPlaying]);

  useShortcuts('speak', {
    'speak:toggle-recording': handleToggleRecording,
    'speak:toggle-translation': () => usePracticeTranslationStore.getState().toggle('speak'),
    'speak:replay-last-assistant': handleReplayLastAssistant,
    'speak:reset-conversation': handleResetConversation,
  });

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || isStreaming || isRecording) return;

    stop();
    const userMsg = { id: nanoid(), role: 'user' as const, content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setTextInput('');

    const currentMessages = useSpeakStore.getState().messages;
    const apiMessages = currentMessages
      .filter((m) => m.role !== 'recording')
      .map((m) => ({ role: m.role, content: m.content }));
    sendToAI(apiMessages);
  }, [textInput, isStreaming, isRecording, stop, addMessage, sendToAI]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stop();
    };
  }, [stop]);

  return {
    messages,
    isStreaming,
    isRecording,
    isSupported: isSupported || !useNative.current, // fallback STT is always "supported"
    isFallbackTranscribing,
    textInput,
    setTextInput,
    handleToggleRecording,
    handleSendText,
    handleKeyDown,
    handlePlayVoice,
    handleToggleTranslation,
    handleResetConversation,
  };
}
