'use client';

import { useEffect, useRef, useState } from 'react';
import { getMonthlyUsage } from '@/lib/pronunciation';
import { toAssessmentWav } from '@/lib/pronunciation/studio-audio';
import { type AcousticAssessment, parseAcousticAssessment } from '@/lib/pronunciation-training';
import { usePronunciationStore } from '@/stores/pronunciation-store';

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function usePronunciationStudio(target: string) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [recognitionStatus, setRecognitionStatus] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AcousticAssessment | null>(null);
  const generation = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const blob = useRef<Blob | null>(null);
  const url = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const assessingRef = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A target switch invalidates every asynchronous continuation, including permission prompts.
  useEffect(() => {
    void target;
    setRecording(false);
    setStarting(false);
    setAssessing(false);
    setError(null);
    setTranscript('');
    setRecognitionStatus('');
    setAudioUrl(null);
    setAssessment(null);
    return () => {
      generation.current++;
      pending.current = false;
      assessingRef.current = false;
      request.current?.abort();
      if (timeout.current) clearTimeout(timeout.current);
      recognition.current?.abort();
      recognition.current = null;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
      blob.current = null;
    };
  }, [target]);

  function stop() {
    if (timeout.current) clearTimeout(timeout.current);
    try {
      recognition.current?.stop();
    } catch {
      /* Recognition may already have ended. */
    }
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function start() {
    if (pending.current || recorder.current?.state === 'recording' || assessingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is unavailable in this browser. / 当前浏览器不支持录音。');
      return;
    }
    const token = ++generation.current;
    recognition.current?.abort();
    recognition.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    pending.current = true;
    setStarting(true);
    setError(null);
    setTranscript('');
    setAssessment(null);
    setRecognitionStatus('');
    blob.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setAudioUrl(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((mime) =>
        MediaRecorder.isTypeSupported(mime),
      );
      const active = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      active.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      active.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (token !== generation.current) return;
        setRecording(false);
        const audio = new Blob(chunks, { type: active.mimeType });
        if (!audio.size) {
          setError('No audio captured. / 未录到音频。');
          return;
        }
        blob.current = audio;
        url.current = URL.createObjectURL(audio);
        setAudioUrl(url.current);
      };
      active.onerror = () => {
        if (token === generation.current) {
          stop();
          setError('Recording failed. / 录音失败。');
        }
      };
      recorder.current = active;
      active.start();
      setRecording(true);
      const host = window as typeof window & {
        SpeechRecognition?: new () => Recognition;
        webkitSpeechRecognition?: new () => Recognition;
      };
      const Constructor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
      if (Constructor) {
        const asr = new Constructor();
        recognition.current = asr;
        asr.lang = 'en-GB';
        asr.continuous = true;
        asr.interimResults = true;
        asr.onresult = (event) => {
          if (token !== generation.current) return;
          setTranscript(
            Array.from(event.results)
              .map((result) => result[0]?.transcript ?? '')
              .join(' ')
              .trim(),
          );
        };
        asr.onerror = (event) => {
          if (token === generation.current)
            setRecognitionStatus(`Recognition unavailable (${event.error}). / 语音识别不可用。`);
        };
        asr.onend = () => {};
        try {
          asr.start();
        } catch {
          setRecognitionStatus('Recognition unavailable. / 语音识别不可用。');
        }
      } else
        setRecognitionStatus(
          'Browser recognition unsupported; recording still works. / 不支持语音识别，但仍可录音回放。',
        );
      timeout.current = setTimeout(() => {
        if (token === generation.current) stop();
      }, 20000);
    } catch (cause) {
      if (token === generation.current) {
        stream.current?.getTracks().forEach((track) => track.stop());
        setError(
          cause instanceof DOMException && cause.name === 'NotAllowedError'
            ? 'Microphone permission denied. Allow access in browser settings. / 麦克风权限被拒绝，请在浏览器设置中允许。'
            : 'Could not start the microphone. Check your input device. / 无法启动麦克风，请检查输入设备。',
        );
      }
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setStarting(false);
      }
    }
  }

  async function assess() {
    if (assessingRef.current || !blob.current || recording || pending.current) return;
    const settings = usePronunciationStore.getState();
    if (!settings.speechSuperAppKey || !settings.speechSuperSecretKey) {
      setError('Configure SpeechSuper in Settings first. / 请先在设置中配置 SpeechSuper。');
      return;
    }
    if (getMonthlyUsage().count >= settings.monthlyLimit) {
      setError('Monthly assessment limit reached. / 已达到每月评估上限。');
      return;
    }
    const token = generation.current;
    const controller = new AbortController();
    request.current = controller;
    assessingRef.current = true;
    setAssessing(true);
    setError(null);
    const deadline = setTimeout(() => controller.abort(), 45000);
    try {
      const wav = await toAssessmentWav(blob.current);
      if (token !== generation.current || controller.signal.aborted) return;
      const body = new FormData();
      body.append('audio', wav, 'recording.wav');
      body.append('referenceText', target);
      body.append('appKey', settings.speechSuperAppKey);
      body.append('secretKey', settings.speechSuperSecretKey);
      const response = await fetch('/api/pronunciation', { method: 'POST', body, signal: controller.signal });
      if (!response.ok) throw new Error('SpeechSuper request failed. / SpeechSuper 请求失败。');
      const result = parseAcousticAssessment(await response.json());
      if (token !== generation.current) return;
      const usage = getMonthlyUsage();
      try {
        localStorage.setItem('echotype_pronunciation_usage', JSON.stringify({ ...usage, count: usage.count + 1 }));
      } catch {
        /* Assessment is still valid when storage is unavailable. */
      }
      setAssessment(result);
    } catch (cause) {
      if (token === generation.current)
        setError(cause instanceof Error ? cause.message : 'Assessment failed. / 评估失败。');
    } finally {
      clearTimeout(deadline);
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
    audioUrl,
    assessment,
    start,
    stop,
    assess,
  };
}
