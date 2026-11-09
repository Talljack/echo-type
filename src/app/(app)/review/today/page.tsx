'use client';

import { ArrowLeft, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RatingButtons } from '@/components/review/rating-buttons';
import { SingleItemPractice } from '@/components/shared/word-book-practice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateRecordWithRating } from '@/lib/daily-plan-progress';
import { toLocalDateKey } from '@/lib/date-key';
import { Rating } from '@/lib/fsrs';
import { useI18n } from '@/lib/i18n/use-i18n';
import { getReviewProgressState } from '@/lib/review-progress';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';
import { cn } from '@/lib/utils';

const BASELINE_STORAGE_PREFIX = 'echotype_review_baseline_';

function getBaselineKey(now: number) {
  return `${BASELINE_STORAGE_PREFIX}${toLocalDateKey(now)}`;
}

export default function TodayReviewPage() {
  const { messages } = useI18n('review');
  const [items, setItems] = useState<TodayReviewItem[]>([]);
  const [baselineCount, setBaselineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingItem, setRatingItem] = useState<TodayReviewItem | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadQueue = useCallback(async () => {
    const backgroundRefresh = hasLoadedOnceRef.current;
    if (backgroundRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const now = Date.now();
      const nextItems = await getTodayReviewItems(now);
      const key = getBaselineKey(now);
      const storedBaseline =
        typeof window === 'undefined' ? 0 : Number.parseInt(window.sessionStorage.getItem(key) ?? '0', 10) || 0;
      const nextBaseline = Math.max(storedBaseline, nextItems.length);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, String(nextBaseline));
      }

      setItems(nextItems);
      setBaselineCount(nextBaseline);
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnceRef.current = true;
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const handleBootstrapReady = () => {
      void loadQueue();
    };
    const handleFocus = () => {
      void loadQueue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadQueue();
      }
    };

    window.addEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('echotype:bootstrap-ready', handleBootstrapReady);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadQueue]);

  const totalCount = Math.max(baselineCount, items.length);
  const remainingCount = items.length;
  const { completedCount, percent: progress, showProgress } = getReviewProgressState(totalCount, remainingCount);
  const currentItem = items[0] ?? null;
  const upcomingItems = useMemo(() => items.slice(1, 4), [items]);
  const fullPracticeLabel = messages.current.openPractice;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-surface border-line shadow-sm">
          <CardContent className="p-6 text-center text-brand-muted text-sm">{messages.page.loading}</CardContent>
        </Card>
      </div>
    );
  }

  const emptyTitle = completedCount > 0 ? messages.empty.doneTitle : messages.empty.noDueTitle;
  const emptyDescription = completedCount > 0 ? messages.empty.doneDescription : messages.empty.noDueDescription;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer rounded-xl text-ink-3 hover:bg-surface-3 hover:text-ink-2"
            aria-label={messages.page.backToDashboard}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-ink">{messages.page.title}</h1>
          <p className="text-sm text-ink-3">{messages.page.description}</p>
        </div>
      </div>

      <Card className="bg-surface border-line shadow-sm">
        <CardContent className="px-5 py-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                {showProgress
                  ? messages.progress.cleared
                      .replace('{{completed}}', String(completedCount))
                      .replace('{{total}}', String(totalCount))
                  : messages.empty.noDueTitle}
              </p>
              <p className="text-xs text-ink-3">
                {(remainingCount === 1 ? messages.progress.remaining : messages.progress.remainingPlural).replace(
                  '{{count}}',
                  String(remainingCount),
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-brand-ink hover:text-brand-ink cursor-pointer"
              onClick={() => void loadQueue()}
            >
              {refreshing ? (
                <RotateCcw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              {messages.progress.refresh}
            </Button>
          </div>

          {showProgress && (
            <div
              className="w-full h-2 bg-surface-3 rounded-full overflow-hidden"
              data-testid="review-progress"
              aria-label={`${Math.round(progress)}% complete`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!currentItem ? (
        <Card className="bg-surface border-line shadow-sm">
          <CardContent className="px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <h2 className="text-base font-semibold">{emptyTitle}</h2>
            </div>
            <p className="text-sm text-ink-3">{emptyDescription}</p>
            <Link href="/dashboard">
              <Button size="sm" className="bg-brand hover:bg-brand-strong cursor-pointer">
                {messages.page.backToDashboard}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="bg-surface border-line shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={cn('text-xs text-brand-muted')}>{messages.current.label}</p>
                  <h2
                    className="text-xl font-semibold text-ink"
                    data-testid="review-current-title"
                    aria-label="review-current-title"
                  >
                    {currentItem.title}
                  </h2>
                </div>
              </div>

              <div className={cn('flex flex-wrap items-center gap-3 text-sm text-ink-3')}>
                <span className="flex items-center gap-1">
                  <Clock3 className="w-4 h-4" />
                  {currentItem.subtitle}
                </span>
              </div>

              <div className={cn('flex gap-3', 'items-center')}>
                <Link href={currentItem.href}>
                  <Button
                    data-testid="review-open-practice"
                    variant="outline"
                    className="border-brand-line text-brand-ink hover:bg-brand-soft cursor-pointer"
                  >
                    {fullPracticeLabel}
                  </Button>
                </Link>
                <p className={cn('text-xs text-ink-3')}>{messages.current.hint}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-line shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className={cn('text-sm font-semibold text-ink')}>{messages.upNext.title}</h3>
              {upcomingItems.length === 0 ? (
                <div className="text-sm text-ink-3">{messages.upNext.lastItem}</div>
              ) : (
                <div className="space-y-3">
                  {upcomingItems.map((item, index) => (
                    <div key={item.id} className="rounded-lg bg-surface-2 px-3 py-2">
                      <p className="text-xs text-ink-4">#{index + 2}</p>
                      <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                      <p className="text-xs text-ink-3 truncate">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {currentItem && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className={cn('text-lg font-semibold text-ink')}>{messages.inline.title}</h3>
              <p className={cn('text-sm text-brand-ink')}>{messages.inline.description}</p>
            </div>
          </div>
          <SingleItemPractice
            item={currentItem.content}
            module={currentItem.module}
            onCompleted={() => {
              setRatingItem(currentItem);
              setShowRating(true);
            }}
          />
          {showRating && ratingItem && ratingItem.id === currentItem.id && (
            <Card
              data-testid="review-rating-card"
              aria-label="review-rating-card"
              className="bg-surface border-line shadow-sm"
            >
              <CardContent className="p-6">
                <RatingButtons
                  fsrsCard={ratingItem.fsrsCard}
                  onRate={async (rating: Rating) => {
                    // Grade from the pre-practice card: practising already auto-graded it once.
                    await updateRecordWithRating(ratingItem.recordId, rating, new Date(), {
                      baseCard: ratingItem.fsrsCard,
                    });
                    setShowRating(false);
                    setRatingItem(null);
                    void loadQueue();
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
