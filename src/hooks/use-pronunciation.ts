'use client';

import { useCallback, useRef, useState } from 'react';
import { assess, type PronunciationResult } from '@/lib/pronunciation';
import { usePronunciationStore } from '@/stores/pronunciation-store';
import { useProviderStore } from '@/stores/provider-store';

interface UsePronunciationOptions {
  referenceText: string;
}

interface UsePronunciationReturn {
  isRecording: boolean;
  isAssessing: boolean;
  result: PronunciationResult | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  assessRecognized: (recognizedText: string) => Promise<void>;
  clearResult: () => void;
}

export function usePronunciation({ referenceText }: UsePronunciationOptions): UsePronunciationReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<Blob | null>(null);

  const { speechSuperAppKey, speechSuperSecretKey, monthlyLimit, provider } = usePronunciationStore();
  const { activeProviderId, providers } = useProviderStore();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        audioRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // collect data every 100ms
      setIsRecording(true);
    } catch {
      setError('Microphone access denied. Please allow microphone access to use pronunciation assessment.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const assessRecognized = useCallback(
    async (recognizedText: string) => {
      setIsAssessing(true);
      setError(null);

      try {
        const audio = audioRef.current ?? new Blob([], { type: 'audio/webm' });

        const providerConfigs: Record<string, unknown> = {};
        for (const [id, config] of Object.entries(providers)) {
          if (config.auth.type !== 'none') {
            providerConfigs[id] = config;
          }
        }

        const pronunciationResult = await assess({
          audio,
          referenceText,
          recognizedText,
          provider,
          speechSuperCredentials:
            speechSuperAppKey && speechSuperSecretKey
              ? { appKey: speechSuperAppKey, secretKey: speechSuperSecretKey }
              : undefined,
          monthlyLimit,
          aiProviderId: activeProviderId,
          aiProviderConfigs: providerConfigs as Parameters<typeof assess>[0]['aiProviderConfigs'],
        });

        setResult(pronunciationResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Pronunciation assessment failed');
      } finally {
        setIsAssessing(false);
      }
    },
    [referenceText, provider, speechSuperAppKey, speechSuperSecretKey, monthlyLimit, activeProviderId, providers],
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    audioRef.current = null;
  }, []);

  return {
    isRecording,
    isAssessing,
    result,
    error,
    startRecording,
    stopRecording,
    assessRecognized,
    clearResult,
  };
}
