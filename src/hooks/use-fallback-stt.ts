'use client';

import { useCallback, useRef, useState } from 'react';
import { useProviderStore } from '@/stores/provider-store';

interface UseFallbackSTTOptions {
  lang?: string;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseFallbackSTTReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

/**
 * Fallback speech-to-text using MediaRecorder + server-side Whisper API.
 * Used when the browser doesn't support the native SpeechRecognition API (e.g. Tauri/WKWebView).
 */
export function useFallbackSTT(options: UseFallbackSTTOptions = {}): UseFallbackSTTReturn {
  const { lang = 'en', onTranscript, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      try {
        const { activeProviderId, providers } = useProviderStore.getState();
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', lang);
        formData.append('provider', activeProviderId);
        formData.append('providerConfigs', JSON.stringify(providers));

        const res = await fetch('/api/stt', { method: 'POST', body: formData });
        const data = (await res.json()) as { text?: string; error?: string };

        if (!res.ok) {
          onErrorRef.current?.(data.error || 'Speech recognition failed.');
          return;
        }

        if (data.text) {
          onTranscriptRef.current?.(data.text);
        } else {
          onTranscriptRef.current?.('');
        }
      } catch {
        onErrorRef.current?.('Failed to connect to speech recognition service.');
      } finally {
        setIsTranscribing(false);
      }
    },
    [lang],
  );

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 100) {
          void transcribeAudio(blob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
    } catch {
      onErrorRef.current?.('Microphone access denied.');
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
