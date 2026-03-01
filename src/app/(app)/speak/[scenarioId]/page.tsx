'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { getScenarioById } from '@/lib/scenarios';
import { useSpeakStore } from '@/stores/speak-store';
import { useTTSStore } from '@/stores/tts-store';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useProviderStore } from '@/stores/provider-store';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { ConversationArea } from '@/components/speak/conversation-area';
import { VoiceInputButton } from '@/components/speak/voice-input-button';
import { ScenarioGoals } from '@/components/speak/scenario-goals';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export default function ConversationPage() {
  const params = useParams();
  const [textInput, setTextInput] = useState('');

  const scenarioId = params.scenarioId as string;
  const scenario = getScenarioById(scenarioId);

  const messages = useSpeakStore((s) => s.messages);
  const isStreaming = useSpeakStore((s) => s.isStreaming);
  const isRecording = useSpeakStore((s) => s.isRecording);
  const addMessage = useSpeakStore((s) => s.addMessage);
  const updateLastMessage = useSpeakStore((s) => s.updateLastMessage);
  const setIsStreaming = useSpeakStore((s) => s.setIsStreaming);
  const setIsRecording = useSpeakStore((s) => s.setIsRecording);
  const resetConversation = useSpeakStore((s) => s.resetConversation);

  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const activeConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];

  const voiceURI = useTTSStore((s) => s.voiceURI);
  const speed = useTTSStore((s) => s.speed);
  const pitch = useTTSStore((s) => s.pitch);
  const volume = useTTSStore((s) => s.volume);
  const hydrateTTS = useTTSStore((s) => s.hydrate);

  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);
  const sendToAIRef = useRef<(msgs: { role: string; content: string }[]) => void>(() => {});
  const getTranscriptRef = useRef<() => { transcript: string; interimTranscript: string }>(
    () => ({ transcript: '', interimTranscript: '' }),
  );

  const sendToAI = useCallback(async (allMessages: { role: string; content: string }[]) => {
    if (!scenario) return;

    // Check if provider is configured
    if (!activeConfig || (!activeConfig.auth.apiKey && !activeConfig.auth.accessToken && activeProviderId !== 'ollama')) {
      // Show error message to user
      const errorMsg = {
        id: nanoid(),
        role: 'assistant' as const,
        content: '⚠️ Please configure an API provider in Settings before starting a conversation. Go to Settings > Providers to set up OpenAI, Ollama, or another provider.',
        timestamp: Date.now()
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
          scenario: {
            title: scenario.title,
            systemPrompt: scenario.systemPrompt,
            goals: scenario.goals,
            difficulty: scenario.difficulty,
          },
          provider: activeProviderId,
          modelId: activeConfig.selectedModelId,
          baseUrl: activeConfig.baseUrl || providerDef.baseUrl,
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

      if (fullText && typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(fullText);

        // Apply voice settings from TTS store
        if (voiceURI) {
          const voices = window.speechSynthesis.getVoices();
          const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.rate = speed;
        utterance.pitch = pitch;
        utterance.volume = volume;

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      updateLastMessage(`❌ Error: ${errorMessage}. Please check your provider configuration in Settings.`);
    } finally {
      setIsStreaming(false);
    }
  }, [scenario, activeProviderId, activeConfig, providerDef, addMessage, updateLastMessage, setIsStreaming, voiceURI, speed, pitch, volume]);

  sendToAIRef.current = sendToAI;

  // Hydrate TTS settings from localStorage
  useEffect(() => {
    hydrateTTS();
  }, [hydrateTTS]);

  useEffect(() => {
    if (!scenario || initRef.current) return;
    initRef.current = true;
    resetConversation();

    const openingMsg = {
      id: nanoid(),
      role: 'assistant' as const,
      content: scenario.openingMessage,
      timestamp: Date.now(),
    };
    addMessage(openingMsg);
  }, [scenario, resetConversation, addMessage]);

  const handleVoiceResult = useCallback((text: string) => {
    const currentMessages = useSpeakStore.getState().messages;
    const recordingMsg = currentMessages.find((m) => m.role === 'recording');
    if (recordingMsg && text) {
      useSpeakStore.setState({
        messages: currentMessages.map((m) =>
          m.role === 'recording' ? { ...m, content: text } : m
        ),
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

    if (!finalText.trim()) {
      useSpeakStore.setState({
        messages: useSpeakStore.getState().messages.filter((m) => m.role !== 'recording'),
      });
      return;
    }

    const currentMessages = useSpeakStore.getState().messages;
    const updatedMessages = currentMessages.map((m) =>
      m.role === 'recording'
        ? { ...m, role: 'user' as const, content: finalText.trim() }
        : m
    );
    useSpeakStore.setState({ messages: updatedMessages });

    const apiMessages = updatedMessages
      .filter((m) => m.role !== 'recording')
      .map((m) => ({ role: m.role, content: m.content }));
    sendToAIRef.current(apiMessages);
  }, [setIsRecording]);

  const { isSupported, startListening, stopListening, transcript, interimTranscript, getTranscript } = useVoiceRecognition({
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
          messages: currentMessages.map((m) =>
            m.role === 'recording' ? { ...m, content: displayText } : m
          ),
        });
      }
    }
  }, [transcript, interimTranscript, isRecording]);

  const handleToggleRecording = useCallback(() => {
    if (isStreaming) return;

    if (isRecording) {
      stopListening();
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      setIsRecording(true);
      addMessage({
        id: nanoid(),
        role: 'recording',
        content: '',
        timestamp: Date.now(),
      });
      startListening();
    }
  }, [isRecording, isStreaming, stopListening, startListening, setIsRecording, addMessage]);

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || isStreaming || isRecording) return;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const userMsg = { id: nanoid(), role: 'user' as const, content: text, timestamp: Date.now() };
    addMessage(userMsg);
    setTextInput('');

    const currentMessages = useSpeakStore.getState().messages;
    const apiMessages = currentMessages
      .filter((m) => m.role !== 'recording')
      .map((m) => ({ role: m.role, content: m.content }));
    sendToAI(apiMessages);
  }, [textInput, isStreaming, isRecording, addMessage, sendToAI]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-indigo-400">Scenario not found</p>
        <Link href="/speak">
          <Button variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer">
            Back to Scenarios
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 py-4 shrink-0">
        <Link href="/speak">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-[var(--font-poppins)] text-indigo-900 truncate">
            {scenario.title}
          </h1>
          <p className="text-xs text-indigo-400 truncate">{scenario.titleZh}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty]}`}>
          {scenario.difficulty}
        </Badge>
      </div>

      <div className="shrink-0 mb-3">
        <ScenarioGoals goals={scenario.goals} difficulty={scenario.difficulty} />
      </div>

      <div className="flex-1 min-h-0 bg-white/60 backdrop-blur-xl rounded-2xl border border-indigo-100/50 flex flex-col overflow-hidden">
        <ConversationArea messages={messages} scenarioTitle={scenario.title} />
      </div>

      <div className="py-4 shrink-0 space-y-3">
        {isSupported ? (
          <VoiceInputButton
            isRecording={isRecording}
            isDisabled={isStreaming}
            onToggle={handleToggleRecording}
          />
        ) : (
          <p className="text-center text-sm text-red-400">
            Speech recognition is not supported in this browser.
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Or type your response..."
            disabled={isStreaming || isRecording}
            className="flex-1 h-10 px-4 text-sm rounded-full border border-indigo-200 bg-white/80 backdrop-blur-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSendText}
            disabled={!textInput.trim() || isStreaming || isRecording}
            size="icon"
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
