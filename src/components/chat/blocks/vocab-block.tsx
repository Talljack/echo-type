'use client';

import { Volume2 } from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';
import type { VocabBlock as VocabBlockType } from '@/types/chat';

interface VocabBlockProps {
  block: VocabBlockType;
}

export function VocabBlockComponent({ block }: VocabBlockProps) {
  const { speak, isSpeaking, stop } = useTTS();

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(block.word);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-ink">{block.word}</span>
        <button
          type="button"
          onClick={handleSpeak}
          className="text-brand-muted hover:text-brand-ink transition-colors cursor-pointer"
          aria-label="Pronounce word"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        {block.phonetic && <span className="text-xs text-ink-4">{block.phonetic}</span>}
        {block.partOfSpeech && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-soft text-brand-ink italic">
            {block.partOfSpeech}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-2">{block.definition}</p>
      {block.example && <p className="text-xs text-ink-3 italic border-l-2 border-brand-line pl-2">{block.example}</p>}
    </div>
  );
}
