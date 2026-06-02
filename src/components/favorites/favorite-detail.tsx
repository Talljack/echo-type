'use client';

import { useState } from 'react';
import { Rating } from 'ts-fsrs';
import {
  IOS_EYEBROW_CLASS,
  IOS_PILL_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TINTED_SUBCARD_CLASS,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { previewRatings } from '@/lib/fsrs';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';

interface Props {
  item: FavoriteItem;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  [Rating.Again]: { label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
  [Rating.Hard]: { label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600' },
  [Rating.Good]: { label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
  [Rating.Easy]: { label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600' },
};

export function FavoriteDetail({ item }: Props) {
  const isIOSNativeHost = detectIOSNativeHost();
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const updateFavorite = useFavoriteStore((s) => s.updateFavorite);
  const [notes, setNotes] = useState(item.notes || '');

  const previews = previewRatings(item.fsrsCard);

  const handleSaveNotes = () => {
    updateFavorite(item.id, { notes });
  };

  return (
    <div
      data-testid={`favorite-detail-${item.id}`}
      className={cn(
        'space-y-3',
        isIOSNativeHost
          ? `ml-3 mr-0 mb-1 p-4 ${IOS_TINTED_SUBCARD_CLASS}`
          : 'ml-12 mr-3 mb-2 rounded-lg border border-slate-100 bg-white p-3',
      )}
    >
      {/* Full translation */}
      <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} p-3.5` : undefined}>
        <p className={cn('mb-0.5 text-xs text-slate-400', isIOSNativeHost && IOS_EYEBROW_CLASS)}>Translation</p>
        <p className="text-sm text-slate-800">{item.translation}</p>
      </div>

      {/* Context */}
      {item.context && (
        <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} p-3.5` : undefined}>
          <p className={cn('mb-1 text-xs text-slate-400', isIOSNativeHost && IOS_EYEBROW_CLASS)}>Context</p>
          <p
            className={cn(
              'text-xs text-slate-600',
              isIOSNativeHost ? 'rounded-[18px] bg-slate-50/90 px-3 py-2.5' : 'bg-slate-50 rounded px-2 py-1.5',
            )}
          >
            {item.context}
          </p>
        </div>
      )}

      {/* Related */}
      {item.related && (
        <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} p-3.5` : undefined}>
          <p className={cn('mb-1.5 text-xs text-slate-400', isIOSNativeHost && IOS_EYEBROW_CLASS)}>Related</p>
          <div className="flex flex-wrap gap-1">
            {item.related.synonyms?.map((s) => (
              <span
                key={s}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600',
                  isIOSNativeHost && IOS_PILL_CLASS,
                )}
              >
                {s}
              </span>
            ))}
            {item.related.wordFamily?.map((w) => (
              <span
                key={w.word}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600',
                  isIOSNativeHost && IOS_PILL_CLASS,
                )}
              >
                {w.word} ({w.pos})
              </span>
            ))}
            {item.related.relatedPhrases?.map((p) => (
              <span
                key={p}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600',
                  isIOSNativeHost && IOS_PILL_CLASS,
                )}
              >
                {p}
              </span>
            ))}
            {item.related.keyVocabulary?.map((kv) => (
              <span
                key={kv.word}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600',
                  isIOSNativeHost && IOS_PILL_CLASS,
                )}
              >
                {kv.word}: {kv.translation}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} p-3.5` : undefined}>
        <p className={cn('mb-1 text-xs text-slate-400', isIOSNativeHost && IOS_EYEBROW_CLASS)}>Notes</p>
        <textarea
          aria-label={`Favorite notes ${item.text}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add notes..."
          className={cn(
            'w-full resize-none border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300',
            isIOSNativeHost ? 'h-20 rounded-2xl bg-slate-50/85 p-3 text-[13px]' : 'h-16 rounded p-2 text-xs',
          )}
        />
      </div>

      {/* FSRS rating */}
      <div className={isIOSNativeHost ? `${IOS_SUBCARD_CLASS} p-3.5` : undefined}>
        <p className={cn('mb-1.5 text-xs text-slate-400', isIOSNativeHost && IOS_EYEBROW_CLASS)}>Review</p>
        <div className="flex gap-1.5">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => {
            const { label, color } = RATING_LABELS[r]!;
            const preview = previews[r];
            return (
              <Button
                key={r}
                size="sm"
                data-testid={`favorite-rate-${item.id}-${r}`}
                aria-label={`Favorite rate ${r}`}
                className={cn(
                  `text-white ${color} flex-1`,
                  isIOSNativeHost ? 'h-9 rounded-full text-[11px]' : 'h-7 text-xs',
                )}
                onClick={() => gradeReview(item.id, r)}
              >
                {label} ({preview.interval})
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
