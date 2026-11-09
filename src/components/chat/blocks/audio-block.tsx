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
    <div className="rounded-xl border border-line bg-surface p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={handlePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          isSpeaking ? 'bg-brand text-white' : 'bg-brand-tint text-brand-ink hover:bg-brand-line'
        }`}
        aria-label={isSpeaking ? 'Stop' : 'Play'}
      >
        <Volume2 className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        {block.label && <p className="text-xs text-brand-ink mb-0.5">{block.label}</p>}
        <p className="text-sm text-ink-2 leading-relaxed">{block.text}</p>
      </div>
    </div>
  );
}
