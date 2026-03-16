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
    <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-indigo-900">{block.word}</span>
        <button
          type="button"
          onClick={handleSpeak}
          className="text-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
          aria-label="Pronounce word"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        {block.phonetic && <span className="text-xs text-slate-400">{block.phonetic}</span>}
        {block.partOfSpeech && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 italic">
            {block.partOfSpeech}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700">{block.definition}</p>
      {block.example && (
        <p className="text-xs text-slate-500 italic border-l-2 border-indigo-200 pl-2">{block.example}</p>
      )}
    </div>
  );
}
