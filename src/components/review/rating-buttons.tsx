'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { previewRatings, Rating } from '@/lib/fsrs';
import type { FSRSCardData } from '@/types/content';

interface RatingButtonsProps {
  fsrsCard?: FSRSCardData;
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

const ratingConfig = [
  { rating: Rating.Again, label: 'Again', variant: 'destructive' as const },
  { rating: Rating.Hard, label: 'Hard', variant: 'outline' as const },
  { rating: Rating.Good, label: 'Good', variant: 'outline' as const },
  { rating: Rating.Easy, label: 'Easy', variant: 'outline' as const },
];

export function RatingButtons({ fsrsCard, onRate, disabled }: RatingButtonsProps) {
  const preview = useMemo(() => previewRatings(fsrsCard), [fsrsCard]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-slate-700">How well did you remember?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {ratingConfig.map(({ rating, label, variant }) => (
          <Button
            key={rating}
            variant={rating === Rating.Good ? 'default' : variant}
            size="sm"
            disabled={disabled}
            onClick={() => onRate(rating)}
            aria-label={`Rate ${label} — review in ${preview[rating].interval}`}
            className={
              rating === Rating.Good
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                : rating === Rating.Easy
                  ? 'border-green-300 text-green-700 hover:bg-green-50 cursor-pointer'
                  : rating === Rating.Hard
                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer'
                    : 'cursor-pointer'
            }
          >
            <span className="flex flex-col items-center leading-tight">
              <span>{label}</span>
              <span className="text-[10px] opacity-70">{preview[rating].interval}</span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
