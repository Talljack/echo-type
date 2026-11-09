'use client';

import { useEffect, useRef, useState } from 'react';
import { createAudioRecording, type RecordedAudio } from '@/lib/audio-recording';
import { assessAcousticRecording } from '@/lib/pronunciation/acoustic-assessment';
import type { AcousticAssessment } from '@/lib/pronunciation-training';

export function usePronunciationStudio(target: string) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AcousticAssessment | null>(null);
  const generation = useRef(0);
  const session = useRef<ReturnType<typeof createAudioRecording> | null>(null);
  const blob = useRef<Blob | null>(null);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const assessingRef = useRef(false);
  const stopping = useRef(false);
  const recognition = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setRecording(false);
    setStarting(false);
    setAssessing(false);
    setError(null);
    setTranscript('');
    setRecognitionStatus('');
    setRecordingBlob(null);
    setAssessment(null);
    return () => {
      generation.current++;
      pending.current = false;
      stopping.current = false;
      assessingRef.current = false;
      request.current?.abort();
      recognition.current?.abort();
      recognition.current = null;
      session.current?.cancel();
      session.current = null;
      blob.current = null;
    };
  }, [target]);
  useEffect(() => {
    if (!recordingBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordingBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordingBlob]);

  async function stop() {
    if (!session.current || stopping.current) return;
    const token = generation.current;
    stopping.current = true;
    recognition.current?.stop();
    try {
      await session.current.stop();
    } catch (cause) {
      if (token === generation.current) setError(cause instanceof Error ? cause.message : 'Recording failed.');
    } finally {
      if (token === generation.current) {
        stopping.current = false;
        setRecording(false);
      }
    }
  }

  async function start() {
    if (pending.current || recording || assessingRef.current || stopping.current) return;
    session.current?.cancel();
    request.current?.abort();
    const token = ++generation.current;
    pending.current = true;
    setStarting(true);
    setError(null);
    setTranscript('');
    setAssessment(null);
    setRecognitionStatus('');
    blob.current = null;
    setRecordingBlob(null);
    const active = createAudioRecording({
      maxDurationMs: 20_000,
      onComplete: (completed: RecordedAudio) => {
        if (token !== generation.current) return;
        recognition.current?.stop();
        blob.current = completed.blob;
        setRecordingBlob(completed.blob);
        setRecording(false);
      },
      onInterrupted: (message) => {
        if (token === generation.current) {
          setRecognitionStatus(message.message);
          setRecording(false);
        }
      },
    });
    session.current = active;
    try {
      await active.start();
      if (token !== generation.current) return;
      if (blob.current) return;
      setRecording(true);
      const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (Constructor) {
        const asr = new Constructor();
        recognition.current = asr;
        asr.lang = 'en-GB';
        asr.continuous = true;
        asr.interimResults = true;
        asr.onresult = (event) => {
          if (token === generation.current)
            setTranscript(
              Array.from(event.results)
                .map((result) => result[0]?.transcript ?? '')
                .join(' ')
                .trim(),
            );
        };
        asr.onerror = () => {
          if (token === generation.current)
            setRecognitionStatus('Recognition unavailable; your recording is still available for acoustic assessment.');
        };
        try {
          asr.start();
        } catch {
          setRecognitionStatus('Recognition unavailable; recording still works.');
        }
      } else setRecognitionStatus('Browser recognition unsupported; recording still works.');
    } catch (cause) {
      if (token === generation.current)
        setError(cause instanceof Error ? cause.message : 'Could not start the microphone.');
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setStarting(false);
      }
    }
  }

  async function assess() {
    if (assessingRef.current || !blob.current || recording || pending.current || stopping.current) return;
    const token = generation.current;
    const controller = new AbortController();
    request.current = controller;
    assessingRef.current = true;
    setAssessing(true);
    setError(null);
    try {
      const result = await assessAcousticRecording(blob.current, target, { signal: controller.signal });
      if (token === generation.current && !controller.signal.aborted) setAssessment(result);
    } catch (cause) {
      if (token === generation.current && !controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Assessment failed.');
    } finally {
      if (token === generation.current) {
        assessingRef.current = false;
        setAssessing(false);
      }
    }
  }
  return {
    recording,
    starting,
    assessing,
    error,
    transcript,
    recognitionStatus,
    recordingBlob,
    audioUrl,
    assessment,
    start,
    stop,
    assess,
  };
}
