'use client';

import { useCallback, useRef, useState } from 'react';
import { useProviderStore } from '@/stores/provider-store';

interface UseFallbackSTTOptions {
  lang?: string;
  /** Called with the final transcript after recording stops. */
  onTranscript?: (text: string) => void;
  /** Called periodically with interim transcript while still recording. */
  onInterimTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  /** Interval (ms) between interim transcription requests. Default 3000. */
  interimIntervalMs?: number;
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
 *
 * Supports periodic interim transcription during recording so the UI can
 * display real-time speech text instead of waiting for the user to stop.
 */
export function useFallbackSTT(options: UseFallbackSTTOptions = {}): UseFallbackSTTReturn {
  const { lang = 'en', onTranscript, onInterimTranscript, onError, interimIntervalMs = 3000 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const interimTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interimInFlightRef = useRef(false);
  const mimeTypeRef = useRef('audio/webm');
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const onErrorRef = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onInterimTranscriptRef.current = onInterimTranscript;
  onErrorRef.current = onError;

  const sendForTranscription = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      const { activeProviderId, providers } = useProviderStore.getState();
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', lang);
      formData.append('provider', activeProviderId);
      formData.append('providerConfigs', JSON.stringify(providers));

      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      const data = (await res.json()) as { text?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Speech recognition failed.');
      }
      return data.text || '';
    },
    [lang],
  );

  const clearInterimTimer = useCallback(() => {
    if (interimTimerRef.current) {
      clearInterval(interimTimerRef.current);
      interimTimerRef.current = null;
    }
  }, []);

  /** Send accumulated audio so far for interim transcription (non-blocking). */
  const requestInterimTranscription = useCallback(() => {
    // Skip if a previous interim request is still in-flight or no data yet
    if (interimInFlightRef.current || chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    if (blob.size < 100) return;

    interimInFlightRef.current = true;
    sendForTranscription(blob)
      .then((text) => {
        if (text != null) {
          onInterimTranscriptRef.current?.(text);
        }
      })
      .catch(() => {
        // Interim failures are non-critical — silently ignore
      })
      .finally(() => {
        interimInFlightRef.current = false;
      });
  }, [sendForTranscription]);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      interimInFlightRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearInterimTimer();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 100) {
          setIsTranscribing(true);
          sendForTranscription(blob)
            .then((text) => {
              onTranscriptRef.current?.(text ?? '');
            })
            .catch(() => {
              onErrorRef.current?.('Failed to connect to speech recognition service.');
            })
            .finally(() => {
              setIsTranscribing(false);
            });
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      // Start periodic interim transcription
      if (onInterimTranscriptRef.current) {
        interimTimerRef.current = setInterval(requestInterimTranscription, interimIntervalMs);
      }
    } catch {
      onErrorRef.current?.('Microphone access denied.');
    }
  }, [sendForTranscription, clearInterimTimer, requestInterimTranscription, interimIntervalMs]);

  const stopRecording = useCallback(() => {
    clearInterimTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [clearInterimTimer]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
