'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { FavoriteType, RelatedData } from '@/types/favorite';

interface Props {
  type: FavoriteType;
  related: RelatedData;
  onSelect: (word: string) => void;
}

export function RelatedRecommendations({ type, related, onSelect }: Props) {
  const [expanded, setExpanded] = useState(true);

  const hasContent =
    (related.synonyms && related.synonyms.length > 0) ||
    (related.wordFamily && related.wordFamily.length > 0) ||
    (related.relatedPhrases && related.relatedPhrases.length > 0) ||
    (related.keyVocabulary && related.keyVocabulary.length > 0);

  if (!hasContent) return null;

  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
      >
        相关推荐
        <ChevronDown className={cn('h-3 w-3 transition-transform', expanded ? '' : '-rotate-90')} />
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {/* Words: synonyms + word family */}
          {type === 'word' && related.synonyms && related.synonyms.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">近义词</p>
              <div className="flex flex-wrap gap-1">
                {related.synonyms.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelect(s)}
                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === 'word' && related.wordFamily && related.wordFamily.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">词族</p>
              <div className="flex flex-wrap gap-1">
                {related.wordFamily.map((w) => (
                  <button
                    key={w.word}
                    type="button"
                    onClick={() => onSelect(w.word)}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    {w.word} <span className="text-slate-400">({w.pos})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phrases: related phrases */}
          {type === 'phrase' && related.relatedPhrases && related.relatedPhrases.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">相关短语</p>
              <div className="flex flex-wrap gap-1">
                {related.relatedPhrases.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSelect(p)}
                    className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sentences: key vocabulary */}
          {type === 'sentence' && related.keyVocabulary && related.keyVocabulary.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 mb-1">关键词汇</p>
              <div className="space-y-0.5">
                {related.keyVocabulary.map((kv) => (
                  <button
                    key={kv.word}
                    type="button"
                    onClick={() => onSelect(kv.word)}
                    className="flex items-center gap-2 text-xs w-full px-2 py-1 rounded hover:bg-emerald-50 transition-colors text-left"
                  >
                    <span className="font-medium text-emerald-700">{kv.word}</span>
                    <span className="text-slate-400">{kv.translation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
