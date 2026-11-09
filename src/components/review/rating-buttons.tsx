'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { previewRatings, Rating } from '@/lib/fsrs';
import { useI18n } from '@/lib/i18n/use-i18n';
import type { FSRSCardData } from '@/types/content';

interface RatingButtonsProps {
  fsrsCard?: FSRSCardData;
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

export function RatingButtons({ fsrsCard, onRate, disabled }: RatingButtonsProps) {
  const { messages } = useI18n('review');
  const preview = useMemo(() => previewRatings(fsrsCard), [fsrsCard]);

  const ratingConfig = [
    { rating: Rating.Again, label: messages.rating.again, variant: 'destructive' as const },
    { rating: Rating.Hard, label: messages.rating.hard, variant: 'outline' as const },
    { rating: Rating.Good, label: messages.rating.good, variant: 'outline' as const },
    { rating: Rating.Easy, label: messages.rating.easy, variant: 'outline' as const },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-ink-2">{messages.rating.question}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ratingConfig.map(({ rating, label, variant }) => (
          <Button
            key={rating}
            data-testid={`review-rate-${rating}`}
            aria-label={`review-rate-${rating}`}
            variant={rating === Rating.Good ? 'default' : variant}
            size="sm"
            disabled={disabled}
            onClick={() => {
              onRate(rating);
            }}
            className={
              rating === Rating.Good
                ? 'bg-brand text-white hover:bg-brand-strong cursor-pointer'
                : rating === Rating.Easy
                  ? 'border-success-line text-success-ink hover:bg-success-soft cursor-pointer'
                  : rating === Rating.Hard
                    ? 'border-warning-line text-warning-ink hover:bg-warning-soft cursor-pointer'
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
