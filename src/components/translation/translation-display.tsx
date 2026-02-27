'use client';

import { Loader2 } from 'lucide-react';
import type { SentenceTranslation } from '@/hooks/use-translation';

interface TranslationDisplayProps {
  translation: string | null;
  sentenceTranslations?: SentenceTranslation[] | null;
  isLoading: boolean;
  show: boolean;
  error?: string | null;
}

export function TranslationDisplay({ translation, sentenceTranslations, isLoading, show, error }: TranslationDisplayProps) {
  if (!show) return null;

  return (
    <div className="px-2 text-sm text-indigo-400 min-h-[1.5rem] mt-3">
      {isLoading ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Translating...
        </span>
      ) : error ? (
        <p className="text-amber-600 text-sm">{error}</p>
      ) : sentenceTranslations && sentenceTranslations.length > 0 ? (
        <div className="space-y-2">
          {sentenceTranslations.map((st, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-slate-600 text-sm leading-relaxed">{st.original}</p>
              <p className="text-indigo-400 text-sm leading-relaxed">{st.translation}</p>
            </div>
          ))}
        </div>
      ) : (
        translation && <p className="leading-relaxed">{translation}</p>
      )}
    </div>
  );
}
