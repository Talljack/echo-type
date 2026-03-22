'use client';

import { useState } from 'react';
import { Rating } from 'ts-fsrs';
import { Button } from '@/components/ui/button';
import { previewRatings } from '@/lib/fsrs';
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
  const gradeReview = useFavoriteStore((s) => s.gradeReview);
  const updateFavorite = useFavoriteStore((s) => s.updateFavorite);
  const [notes, setNotes] = useState(item.notes || '');

  const previews = previewRatings(item.fsrsCard);

  const handleSaveNotes = () => {
    updateFavorite(item.id, { notes });
  };

  return (
    <div className="ml-12 mr-3 mb-2 p-3 rounded-lg bg-white border border-slate-100 space-y-3">
      {/* Full translation */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Translation</p>
        <p className="text-sm text-slate-800">{item.translation}</p>
      </div>

      {/* Context */}
      {item.context && (
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Context</p>
          <p className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">{item.context}</p>
        </div>
      )}

      {/* Related */}
      {item.related && (
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Related</p>
          <div className="flex flex-wrap gap-1">
            {item.related.synonyms?.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                {s}
              </span>
            ))}
            {item.related.wordFamily?.map((w) => (
              <span key={w.word} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {w.word} ({w.pos})
              </span>
            ))}
            {item.related.relatedPhrases?.map((p) => (
              <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                {p}
              </span>
            ))}
            {item.related.keyVocabulary?.map((kv) => (
              <span key={kv.word} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                {kv.word}: {kv.translation}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Add notes..."
          className="w-full text-xs p-2 rounded border border-slate-200 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>

      {/* FSRS rating */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Review</p>
        <div className="flex gap-1.5">
          {[Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].map((r) => {
            const { label, color } = RATING_LABELS[r]!;
            const preview = previews[r];
            return (
              <Button
                key={r}
                size="sm"
                className={`h-7 text-xs text-white ${color} flex-1`}
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
