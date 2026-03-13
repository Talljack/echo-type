'use client';

import { Mic, MicOff } from 'lucide-react';
import { useCallback } from 'react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';

interface ChatVoiceInputProps {
  onTranscript: (text: string) => void;
}

export function ChatVoiceInput({ onTranscript }: ChatVoiceInputProps) {
  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        onTranscript(text.trim());
      }
    },
    [onTranscript],
  );

  const { isListening, interimTranscript, isSupported, startListening, stopListening } = useVoiceRecognition({
    lang: 'en-US',
    continuous: false,
    interimResults: true,
    onResult: handleResult,
  });

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-2">
      {isListening && interimTranscript && (
        <span className="text-xs text-slate-400 truncate max-w-[200px] italic">{interimTranscript}</span>
      )}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        title={isListening ? 'Stop listening' : 'Voice input'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
    </div>
  );
}
