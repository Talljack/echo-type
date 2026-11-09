'use client';

import { useState } from 'react';
import { Rating } from 'ts-fsrs';
import { Button } from '@/components/ui/button';
import { previewRatings } from '@/lib/fsrs';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import type { FavoriteItem } from '@/types/favorite';

interface Props {
  item: FavoriteItem;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  [Rating.Again]: { label: 'Again', color: 'bg-danger hover:bg-danger' },
  [Rating.Hard]: { label: 'Hard', color: 'bg-warning hover:bg-warning' },
  [Rating.Good]: { label: 'Good', color: 'bg-success hover:bg-success' },
  [Rating.Easy]: { label: 'Easy', color: 'bg-info hover:bg-info' },
};

export function FavoriteDetail({ item }: Props) {
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
      className={cn('space-y-3', 'ml-12 mr-3 mb-2 rounded-lg border border-line bg-surface p-3')}
    >
      {/* Full translation */}
      <div>
        <p className={cn('mb-0.5 text-xs text-ink-4')}>Translation</p>
        <p className="text-sm text-ink">{item.translation}</p>
      </div>

      {/* Context */}
      {item.context && (
        <div>
          <p className={cn('mb-1 text-xs text-ink-4')}>Context</p>
          <p className={cn('text-xs text-ink-2', 'bg-surface-2 rounded px-2 py-1.5')}>{item.context}</p>
        </div>
      )}

      {/* Related */}
      {item.related && (
        <div>
          <p className={cn('mb-1.5 text-xs text-ink-4')}>Related</p>
          <div className="flex flex-wrap gap-1">
            {item.related.synonyms?.map((s) => (
              <span key={s} className={cn('text-xs px-2 py-0.5 rounded-full bg-brand-soft text-brand-ink')}>
                {s}
              </span>
            ))}
            {item.related.wordFamily?.map((w) => (
              <span key={w.word} className={cn('text-xs px-2 py-0.5 rounded-full bg-surface-3 text-ink-2')}>
                {w.word} ({w.pos})
              </span>
            ))}
            {item.related.relatedPhrases?.map((p) => (
              <span key={p} className={cn('text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600')}>
                {p}
              </span>
            ))}
            {item.related.keyVocabulary?.map((kv) => (
              <span key={kv.word} className={cn('text-xs px-2 py-0.5 rounded-full bg-success-soft text-success')}>
                {kv.word}: {kv.translation}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className={cn('mb-1 text-xs text-ink-4')}>Notes</p>
        <textarea
          data-testid={`favorite-notes-${item.id}`}
          aria-label={`Favorite notes ${item.text}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add notes..."
          className={cn(
            'w-full resize-none border border-line focus:outline-none focus:ring-1 focus:ring-brand-line',
            'h-16 rounded p-2 text-xs',
          )}
        />
      </div>

      {/* FSRS rating */}
      <div>
        <p className={cn('mb-1.5 text-xs text-ink-4')}>Review</p>
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
                className={cn(`text-white ${color} flex-1`, 'h-7 text-xs')}
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
