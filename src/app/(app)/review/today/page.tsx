'use client';

import { ArrowLeft, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RatingButtons } from '@/components/review/rating-buttons';
import { SingleItemPractice } from '@/components/shared/word-book-practice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateRecordWithRating } from '@/lib/daily-plan-progress';
import { toLocalDateKey } from '@/lib/date-key';
import { Rating } from '@/lib/fsrs';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';

const BASELINE_STORAGE_PREFIX = 'echotype_review_baseline_';

const moduleLabel: Record<TodayReviewItem['module'], string> = {
  listen: 'Listen',
  speak: 'Speak',
  read: 'Read',
  write: 'Write',
};

function getBaselineKey(now: number) {
  return `${BASELINE_STORAGE_PREFIX}${toLocalDateKey(now)}`;
}

export default function TodayReviewPage() {
  const [items, setItems] = useState<TodayReviewItem[]>([]);
  const [baselineCount, setBaselineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [ratingItem, setRatingItem] = useState<TodayReviewItem | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const handleFocus = () => {
      void loadQueue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadQueue();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadQueue]);

  const totalCount = Math.max(baselineCount, items.length);
  const remainingCount = items.length;
  const completedCount = Math.max(0, totalCount - remainingCount);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;
  const currentItem = items[0] ?? null;
  const upcomingItems = useMemo(() => items.slice(1, 4), [items]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-6 text-center text-indigo-400 text-sm">Loading today&apos;s reviews...</CardContent>
        </Card>
      </div>
    );
  }

  const emptyTitle = completedCount > 0 ? "Today's reviews are done" : 'No reviews due right now';
  const emptyDescription =
    completedCount > 0
      ? 'You cleared all currently due review items. Come back later if more items become due.'
      : 'Once items reach their next review time, they will appear here automatically.';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-[var(--font-poppins)] text-slate-900">Today&apos;s Review</h1>
          <p className="text-sm text-slate-500">
            Focus on due items first. When you want something new, go back to Dashboard and continue today&apos;s plan.
          </p>
        </div>
      </div>

      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {completedCount}/{totalCount || 0} cleared in this visit
              </p>
              <p className="text-xs text-slate-500">
                {remainingCount} review item{remainingCount === 1 ? '' : 's'} remaining
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
              onClick={() => void loadQueue()}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {!currentItem ? (
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="text-lg font-semibold">{emptyTitle}</h2>
            </div>
            <p className="text-sm text-slate-500">{emptyDescription}</p>
            <Link href="/dashboard">
              <Button className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-indigo-400">Current review</p>
                  <h2 className="text-xl font-semibold text-slate-900">{currentItem.title}</h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
                  {moduleLabel[currentItem.module]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock3 className="w-4 h-4" />
                  {currentItem.subtitle}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Link href={currentItem.href}>
                  <Button
                    variant="outline"
                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                  >
                    Open Full Practice Page
                  </Button>
                </Link>
                <p className="text-xs text-slate-500">
                  You can review inline below, or open the full module page if you need the full workflow.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-100 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Up Next</h3>
              {upcomingItems.length === 0 ? (
                <p className="text-sm text-slate-500">This is the last due review item for now.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingItems.map((item, index) => (
                    <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-400">#{index + 2}</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
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
              <h3 className="text-lg font-semibold text-indigo-900">Inline Review</h3>
              <p className="text-sm text-indigo-500">
                Complete this item here and the queue will advance automatically.
              </p>
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
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <RatingButtons
                  fsrsCard={ratingItem.fsrsCard}
                  onRate={async (rating: Rating) => {
                    await updateRecordWithRating(ratingItem.recordId, rating);
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
