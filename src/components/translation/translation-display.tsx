'use client';

import { Loader2 } from 'lucide-react';

interface TranslationDisplayProps {
  translation: string | null;
  isLoading: boolean;
  show: boolean;
}

export function TranslationDisplay({ translation, isLoading, show }: TranslationDisplayProps) {
  if (!show) return null;

  return (
    <div className="px-2 text-sm text-indigo-400 min-h-[1.5rem] mt-3">
      {isLoading ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Translating...
        </span>
      ) : (
        translation && <p className="leading-relaxed">{translation}</p>
      )}
    </div>
  );
}
