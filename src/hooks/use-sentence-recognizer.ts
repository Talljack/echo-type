'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';

type BrowserSpeechRecognition = typeof window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

export type RecognizerStatus = 'idle' | 'listening' | 'processing';

const ERROR_MESSAGES: Record<string, [string, string]> = {
  'not-allowed': [
    'Microphone access was denied. Allow it in your browser and try again.',
    '麦克风权限被拒绝，请在浏览器中允许后重试。',
  ],
  'service-not-allowed': ['Speech recognition is blocked by the browser.', '浏览器阻止了语音识别。'],
  'audio-capture': ['No working microphone was found.', '没有找到可用的麦克风。'],
  'no-speech': ['No speech detected. Try again a little louder.', '没有听到声音，请再大声一点试试。'],
};

function nativeRecognition() {
  if (typeof window === 'undefined') return undefined;
  const browserWindow = window as BrowserSpeechRecognition;
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
}

/**
 * Recognise one spoken sentence. Uses the browser's own recognition when
 * available (nothing is uploaded) and only falls back to server
 * speech-to-text when the browser has none or its service fails.
 */
export function useSentenceRecognizer({ zh, onResult }: { zh: boolean; onResult: (transcript: string) => void }) {
  const [status, setStatus] = useState<RecognizerStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const nativeOk = useRef(true);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const message = useCallback(
    (code: string) => {
      const pair = ERROR_MESSAGES[code];
      if (pair) return zh ? pair[1] : pair[0];
      return zh ? `语音识别已停止：${code}` : `Speech recognition stopped: ${code}`;
    },
    [zh],
  );

  const fallback = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback((text: string) => {
      setStatus('idle');
      setTranscript(text);
      if (text.trim()) onResultRef.current(text);
      else setError(null);
    }, []),
    onError: useCallback((text: string) => {
      setStatus('idle');
      setError(text);
    }, []),
  });

  const startFallback = useCallback(() => {
    setUsingFallback(true);
    setStatus('listening');
    void fallback.startRecording();
  }, [fallback]);

  const start = useCallback(() => {
    setError(null);
    setTranscript('');
    const Recognition = nativeRecognition();
    if (!Recognition || !nativeOk.current) {
      startFallback();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    let finalText = '';
    let latest = '';
    let failed = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      finalText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      latest = `${finalText} ${interim}`.replace(/\s+/g, ' ').trim();
      setTranscript(latest);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return;
      failed = true;
      if (event.error === 'network' || event.error === 'service-not-allowed') {
        // Browser service unavailable (common in desktop webviews) → server speech-to-text.
        nativeOk.current = false;
        recognitionRef.current = null;
        startFallback();
        return;
      }
      setStatus('idle');
      setError(message(event.error));
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      if (failed) return;
      setStatus('idle');
      const text = (finalText || latest).trim();
      if (text) onResultRef.current(text);
      else setError(message('no-speech'));
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setUsingFallback(false);
      setStatus('listening');
    } catch {
      recognitionRef.current = null;
      nativeOk.current = false;
      startFallback();
    }
  }, [message, startFallback]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      setStatus('processing');
      recognitionRef.current.stop();
      return;
    }
    if (fallback.isRecording) {
      setStatus('processing');
      fallback.stopRecording();
    }
  }, [fallback]);

  const cancel = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
    if (fallback.isRecording) fallback.stopRecording();
    setStatus('idle');
  }, [fallback]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return {
    status: fallback.isTranscribing ? ('processing' as const) : status,
    transcript,
    error,
    usingFallback,
    supported: Boolean(nativeRecognition()) || typeof MediaRecorder !== 'undefined',
    start,
    stop,
    cancel,
  };
}
