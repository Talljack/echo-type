'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiBase } from '@/lib/tauri';
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
  /** Timeout (ms) for each STT request. Default 15000. */
  requestTimeoutMs?: number;
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
  const {
    lang = 'en',
    onTranscript,
    onInterimTranscript,
    onError,
    interimIntervalMs = 3000,
    requestTimeoutMs = 15000,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const interimTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimInFlightRef = useRef(false);
  const finalizingRef = useRef(false);
  const mimeTypeRef = useRef('audio/webm');
  const onTranscriptRef = useRef(onTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const onErrorRef = useRef(onError);
  const disposedRef = useRef(false);
  onTranscriptRef.current = onTranscript;
  onInterimTranscriptRef.current = onInterimTranscript;
  onErrorRef.current = onError;

  const sendForTranscription = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      const { activeProviderId, providers } = useProviderStore.getState();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', lang);
      formData.append('provider', activeProviderId);
      formData.append('providerConfigs', JSON.stringify(providers));

      try {
        const res = await fetch(`${getApiBase()}/api/stt`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        const data = (await res.json()) as { text?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error || 'Speech recognition failed.');
        }
        return data.text || '';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Speech recognition timed out. Please try again or check your provider settings.');
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [lang, requestTimeoutMs],
  );

  const clearInterimTimer = useCallback(() => {
    if (interimTimerRef.current) {
      clearInterval(interimTimerRef.current);
      interimTimerRef.current = null;
    }
  }, []);

  const clearStopFallbackTimer = useCallback(() => {
    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
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

  const finalizeRecording = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    clearStopFallbackTimer();

    const stream = streamRef.current;
    stream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    if (blob.size <= 100) {
      if (!disposedRef.current) {
        onErrorRef.current?.('No speech detected. Please try again.');
        setIsTranscribing(false);
      }
      finalizingRef.current = false;
      return;
    }

    if (!disposedRef.current) {
      setIsTranscribing(true);
    }

    try {
      const text = await sendForTranscription(blob);
      if (!disposedRef.current) {
        onTranscriptRef.current?.(text ?? '');
      }
    } catch (error) {
      if (!disposedRef.current) {
        const message =
          error instanceof Error && error.message ? error.message : 'Failed to connect to speech recognition service.';
        onErrorRef.current?.(message);
      }
    } finally {
      if (!disposedRef.current) {
        setIsTranscribing(false);
      }
      finalizingRef.current = false;
    }
  }, [clearStopFallbackTimer, sendForTranscription]);

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = [];
      interimInFlightRef.current = false;
      finalizingRef.current = false;
      clearStopFallbackTimer();
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
        void finalizeRecording();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      // Start periodic interim transcription
      if (onInterimTranscriptRef.current) {
        interimTimerRef.current = setInterval(requestInterimTranscription, interimIntervalMs);
      }
    } catch {
      if (disposedRef.current) return;
      onErrorRef.current?.('Microphone access denied.');
    }
  }, [clearInterimTimer, clearStopFallbackTimer, finalizeRecording, requestInterimTranscription, interimIntervalMs]);

  const stopRecording = useCallback(() => {
    clearInterimTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearStopFallbackTimer();
    stopFallbackTimerRef.current = setTimeout(() => {
      void finalizeRecording();
    }, 1000);
    setIsRecording(false);
  }, [clearInterimTimer, clearStopFallbackTimer, finalizeRecording]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      clearInterimTimer();
      clearStopFallbackTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
    };
  }, [clearInterimTimer, clearStopFallbackTimer]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
