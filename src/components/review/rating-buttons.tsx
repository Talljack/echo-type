'use client';

import { useMemo } from 'react';
import { IOS_PILL_CLASS } from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { previewRatings, Rating } from '@/lib/fsrs';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, nativeHaptic } from '@/lib/tauri';
import type { FSRSCardData } from '@/types/content';

interface RatingButtonsProps {
  fsrsCard?: FSRSCardData;
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}

export function RatingButtons({ fsrsCard, onRate, disabled }: RatingButtonsProps) {
  const isIOSNativeHost = detectIOSNativeHost();
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
        {isIOSNativeHost ? <span className={IOS_PILL_CLASS}>FSRS rating</span> : null}
        <p className="text-sm font-medium text-slate-700">{messages.rating.question}</p>
      </div>
      <div
        className={
          isIOSNativeHost ? 'grid w-full grid-cols-2 gap-2 sm:grid-cols-4' : 'flex flex-wrap justify-center gap-2'
        }
      >
        {ratingConfig.map(({ rating, label, variant }) => (
          <Button
            key={rating}
            data-testid={`review-rate-${rating}`}
            aria-label={`review-rate-${rating}`}
            variant={rating === Rating.Good ? 'default' : variant}
            size="sm"
            disabled={disabled}
            onClick={() => {
              nativeHaptic(rating === Rating.Again ? 'warning' : rating === Rating.Easy ? 'success' : 'light');
              onRate(rating);
            }}
            className={
              isIOSNativeHost
                ? rating === Rating.Good
                  ? 'h-auto min-h-16 rounded-[20px] bg-slate-900 px-3 py-3 text-white hover:bg-slate-800 cursor-pointer'
                  : rating === Rating.Easy
                    ? 'h-auto min-h-16 rounded-[20px] border-emerald-200 bg-emerald-50/90 px-3 py-3 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                    : rating === Rating.Hard
                      ? 'h-auto min-h-16 rounded-[20px] border-amber-200 bg-amber-50/90 px-3 py-3 text-amber-700 hover:bg-amber-100 cursor-pointer'
                      : 'h-auto min-h-16 rounded-[20px] bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                : rating === Rating.Good
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
