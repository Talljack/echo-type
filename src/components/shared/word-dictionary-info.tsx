'use client';

import { Loader2 } from 'lucide-react';
import { useWordDictionary } from '@/hooks/use-word-dictionary';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import type { PracticeModule } from '@/types/translation';

interface WordDictionaryInfoProps {
  word: string;
  targetLang: string;
  module: PracticeModule;
}

export function WordDictionaryInfo({ word, targetLang, module }: WordDictionaryInfoProps) {
  const showTranslation = usePracticeTranslationStore((s) => s.isVisible(module));
  const { phonetic, pos, translation, isLoading } = useWordDictionary(word, targetLang, true);

  const hasPhoneticOrPos = phonetic || pos;
  const hasTranslation = showTranslation && translation;

  if (isLoading) {
    return (
      <div className="min-h-[2.75rem] flex items-center justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!hasPhoneticOrPos && !hasTranslation) return null;

  return (
    <div className="space-y-0.5">
      {hasPhoneticOrPos && (
        <div className="min-h-[1.5rem] flex items-center justify-center gap-1.5">
          {phonetic && <span className="text-sm text-indigo-500">{phonetic}</span>}
          {phonetic && pos && <span className="text-xs text-slate-300">·</span>}
          {pos && <span className="text-xs text-slate-400">{pos}</span>}
        </div>
      )}
      {hasTranslation && (
        <p className="min-h-[1.25rem] text-[15px] text-indigo-400/80 text-center font-medium">{translation}</p>
      )}
    </div>
  );
}
