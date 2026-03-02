'use client';

import { Loader2, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { SentenceTranslation } from '@/hooks/use-translation';

interface TranslationDisplayProps {
  translation: string | null;
  sentenceTranslations?: SentenceTranslation[] | null;
  isLoading: boolean;
  show: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function isApiKeyError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('api key') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('settings')
  );
}

export function TranslationDisplay({
  translation,
  sentenceTranslations,
  isLoading,
  show,
  error,
  onRetry,
}: TranslationDisplayProps) {
  if (!show) return null;

  return (
    <div className="px-2 text-sm text-indigo-400 min-h-[1.5rem] mt-3">
      {isLoading ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Translating...
        </span>
      ) : error ? (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-amber-600 text-sm">{error}</p>
          {isApiKeyError(error) ? (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
            >
              <Settings className="w-3 h-3" />
              Go to Settings
            </Link>
          ) : onRetry ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs text-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          ) : null}
        </div>
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
