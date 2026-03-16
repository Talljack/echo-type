'use client';

import { Volume2 } from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import type { AudioBlock as AudioBlockType } from '@/types/chat';

interface AudioBlockProps {
  block: AudioBlockType;
}

export function AudioBlockComponent({ block }: AudioBlockProps) {
  const { speak, isSpeaking, stop } = useTTS();

  const handlePlay = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(block.text);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={handlePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          isSpeaking ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
        }`}
        aria-label={isSpeaking ? 'Stop' : 'Play'}
      >
        <Volume2 className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        {block.label && <p className="text-xs text-indigo-500 mb-0.5">{block.label}</p>}
        <p className="text-sm text-slate-700 leading-relaxed">{block.text}</p>
      </div>
    </div>
  );
}
