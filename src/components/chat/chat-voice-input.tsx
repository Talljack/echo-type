'use client';

import { Loader2, Mic, MicOff } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';

interface ChatVoiceInputProps {
  onTranscript: (text: string) => void;
}

export function ChatVoiceInput({ onTranscript }: ChatVoiceInputProps) {
  const [fallbackInterim, setFallbackInterim] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        onTranscript(text.trim());
      }
    },
    [onTranscript],
  );

  const {
    isListening,
    interimTranscript,
    isSupported: nativeSupported,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    lang: 'en-US',
    continuous: false,
    interimResults: true,
    onResult: handleResult,
  });

  const fallbackSTT = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback(
      (text: string) => {
        setIsTranscribing(false);
        setFallbackInterim('');
        if (text.trim()) onTranscript(text.trim());
      },
      [onTranscript],
    ),
    onInterimTranscript: useCallback((text: string) => {
      setFallbackInterim(text);
    }, []),
    onError: useCallback(() => {
      setIsTranscribing(false);
      setFallbackInterim('');
    }, []),
  });

  const isFallbackRecording = fallbackSTT.isRecording;
  const activeListening = nativeSupported ? isListening : isFallbackRecording;
  const displayInterim = nativeSupported ? interimTranscript : fallbackInterim;

  const handleToggle = useCallback(() => {
    if (nativeSupported) {
      if (isListening) stopListening();
      else startListening();
    } else {
      if (isFallbackRecording) {
        fallbackSTT.stopRecording();
        setIsTranscribing(true);
      } else {
        void fallbackSTT.startRecording();
      }
    }
  }, [nativeSupported, isListening, isFallbackRecording, startListening, stopListening, fallbackSTT]);

  if (isTranscribing) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-brand-ink animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {activeListening && displayInterim && (
        <span className="text-xs text-ink-4 truncate max-w-[200px] italic">{displayInterim}</span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          activeListening
            ? 'bg-danger-soft text-danger animate-pulse'
            : 'text-ink-4 hover:text-brand-ink hover:bg-brand-soft'
        }`}
        aria-label={activeListening ? 'Stop listening' : 'Start voice input'}
        title={activeListening ? 'Stop listening' : 'Voice input'}
      >
        {activeListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
}
