'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioRecording, type RecordedAudio } from '@/lib/audio-recording';
import type { PronunciationResult } from '@/lib/pronunciation';
import { assessAcousticRecording } from '@/lib/pronunciation/acoustic-assessment';

interface RecordingOptions {
  onComplete?: (recording: RecordedAudio) => void;
  onInterrupted?: (error: Error) => void;
}

export function usePronunciation({ referenceText }: { referenceText: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audio = useRef<RecordedAudio | null>(null);
  const session = useRef<ReturnType<typeof createAudioRecording> | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const starting = useRef(false);

  const clearResult = useCallback(() => {
    generation.current++;
    session.current?.cancel();
    session.current = null;
    request.current?.abort();
    starting.current = false;
    audio.current = null;
    setIsRecording(false);
    setIsAssessing(false);
    setResult(null);
    setError(null);
    setRecordingBlob(null);
  }, []);

  useEffect(() => {
    clearResult();
    return () => {
      generation.current++;
      session.current?.cancel();
      request.current?.abort();
    };
  }, [referenceText, clearResult]);
  useEffect(() => {
    if (!recordingBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordingBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordingBlob]);

  const startRecording = useCallback(
    async (options: RecordingOptions = {}) => {
      if (starting.current) return;
      clearResult();
      starting.current = true;
      const token = generation.current;
      const active = createAudioRecording({
        maxDurationMs: 120_000,
        onComplete: (recording) => {
          if (token !== generation.current) return;
          audio.current = recording;
          setRecordingBlob(recording.blob);
          setIsRecording(false);
          options.onComplete?.(recording);
        },
        onInterrupted: (message) => {
          if (token === generation.current) {
            setIsRecording(false);
            setError(message.message);
            options.onInterrupted?.(message);
          }
        },
      });
      session.current = active;
      try {
        await active.start();
        if (token === generation.current && !audio.current) setIsRecording(true);
      } catch (cause) {
        if (token === generation.current)
          setError(cause instanceof Error ? cause.message : 'Unable to start recording.');
        throw cause;
      } finally {
        if (token === generation.current) starting.current = false;
      }
    },
    [clearResult],
  );

  const stopRecording = useCallback(async (): Promise<RecordedAudio> => {
    const active = session.current;
    if (!active) throw new Error('Record your voice before requesting acoustic assessment.');
    const token = generation.current;
    try {
      const completed = await active.stop();
      if (token !== generation.current) throw new DOMException('Recording cancelled', 'AbortError');
      audio.current = completed;
      setRecordingBlob(completed.blob);
      setIsRecording(false);
      return completed;
    } catch (cause) {
      if (token === generation.current) {
        setIsRecording(false);
        setError(cause instanceof Error ? cause.message : 'Unable to finish recording.');
      }
      throw cause;
    }
  }, []);

  const assessRecognized = useCallback(
    async (_recognizedText: string) => {
      const token = generation.current;
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      setIsAssessing(true);
      setError(null);
      try {
        // Await the recorder's completion; never score an empty placeholder blob.
        const completed = audio.current ?? (await stopRecording());
        if (token !== generation.current) return;
        const assessment = await assessAcousticRecording(completed.blob, referenceText, { signal: controller.signal });
        if (token !== generation.current || controller.signal.aborted) return;
        setResult({
          provider: 'speechsuper',
          overallScore: assessment.overall,
          fluencyScore: assessment.fluency,
          completenessScore: assessment.completeness,
          words: assessment.words,
          tips: [],
        });
      } catch (cause) {
        if (token === generation.current && !controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Pronunciation assessment failed.');
      } finally {
        if (token === generation.current && request.current === controller) setIsAssessing(false);
      }
    },
    [referenceText, stopRecording],
  );

  return {
    isRecording,
    isAssessing,
    result,
    error,
    recordingBlob,
    audioUrl,
    startRecording,
    stopRecording,
    assessRecognized,
    clearResult,
  };
}
