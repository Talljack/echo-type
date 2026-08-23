'use client';

import { ArrowLeft, CheckCircle2, Clock3, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import { RatingButtons } from '@/components/review/rating-buttons';
import {
  IOS_EYEBROW_CLASS,
  IOS_PAGE_CONTAINER_CLASS,
  IOS_PILL_CLASS,
  IOS_SECONDARY_BUTTON_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOS_TINTED_SUBCARD_CLASS,
  IOSEmptyStateCard,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { SingleItemPractice } from '@/components/shared/word-book-practice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { updateRecordWithRating } from '@/lib/daily-plan-progress';
import { toLocalDateKey } from '@/lib/date-key';
import { Rating } from '@/lib/fsrs';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';
import { cn } from '@/lib/utils';

const BASELINE_STORAGE_PREFIX = 'echotype_review_baseline_';

function getBaselineKey(now: number) {
  return `${BASELINE_STORAGE_PREFIX}${toLocalDateKey(now)}`;
}

export default function TodayReviewPage() {
  const { messages } = useI18n('review');
  const isIOSNativeHost = detectIOSNativeHost();
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
  const completedCount = Math.max(0, totalCount - remainingCount);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;
  const currentItem = items[0] ?? null;
  const upcomingItems = useMemo(() => items.slice(1, 4), [items]);
  const currentModuleLabel = currentItem ? messages.modules[currentItem.module] : '';
  const fullPracticeLabel =
    currentItem && isIOSNativeHost ? `Open in ${messages.modules[currentItem.module]}` : messages.current.openPractice;

  useEffect(() => {
    reportNativeQAState({
      page: 'review',
      loading,
      totalCount,
      remainingCount,
      completedCount,
      hasCurrentItem: !!currentItem,
    });
  }, [completedCount, currentItem, loading, remainingCount, totalCount]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card
          className={
            isIOSNativeHost
              ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
              : 'bg-white border-slate-100 shadow-sm'
          }
        >
          <CardContent className="p-6 text-center text-indigo-400 text-sm">{messages.page.loading}</CardContent>
        </Card>
      </div>
    );
  }

  const emptyTitle = completedCount > 0 ? messages.empty.doneTitle : messages.empty.noDueTitle;
  const emptyDescription = completedCount > 0 ? messages.empty.doneDescription : messages.empty.noDueDescription;

  return (
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'max-w-4xl mx-auto space-y-4'}>
      {isIOSNativeHost ? (
        <IOSPageHeader
          badge="Review"
          tone="emerald"
          title={messages.page.title}
          description={messages.page.description}
          action={
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="inline-flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={messages.page.backToDashboard}
                  className="h-10 w-10 rounded-full border border-slate-200/90 bg-white/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <IOSInlineChatButton iconOnly className="shrink-0 self-start" />
            </div>
          }
        />
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label={messages.page.backToDashboard}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="font-[var(--font-poppins)] text-xl font-bold text-slate-900">{messages.page.title}</h1>
            <p className="text-sm text-slate-500">{messages.page.description}</p>
          </div>
        </div>
      )}

      <Card className={isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-white border-slate-100 shadow-sm'}>
        <CardContent className={isIOSNativeHost ? 'px-5 py-4 space-y-3' : 'px-5 py-3 space-y-2.5'}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {messages.progress.cleared
                  .replace('{{completed}}', String(completedCount))
                  .replace('{{total}}', String(totalCount || 0))}
              </p>
              <p className="text-xs text-slate-500">
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
              className={
                isIOSNativeHost
                  ? `${IOS_SECONDARY_BUTTON_CLASS} h-9 px-4 text-slate-600 hover:text-slate-900 cursor-pointer`
                  : 'text-indigo-500 hover:text-indigo-700 cursor-pointer'
              }
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
          {isIOSNativeHost ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={IOS_PILL_CLASS}>{completedCount} completed</span>
              <span className={IOS_PILL_CLASS}>{remainingCount} remaining</span>
              <span className={IOS_PILL_CLASS}>{Math.round(progress)}% focus</span>
            </div>
          ) : null}
          <div
            className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"
            data-testid="review-progress"
            aria-label={`${Math.round(progress)}% complete`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {!currentItem ? (
        isIOSNativeHost ? (
          <div className="pb-36">
            <IOSEmptyStateCard
              icon={CheckCircle2}
              tone="emerald"
              title={emptyTitle}
              description={emptyDescription}
              action={
                <Link href="/dashboard" className="inline-flex">
                  <Button className="h-10 rounded-full bg-indigo-600 px-4 text-white shadow-[0_12px_26px_rgba(79,70,229,0.2)] hover:bg-indigo-700 cursor-pointer">
                    {messages.page.backToDashboard}
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <Card className={isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-white border-slate-100 shadow-sm'}>
            <CardContent className={isIOSNativeHost ? 'px-5 py-4 space-y-3 pb-36' : 'px-5 py-4 space-y-2'}>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4.5 h-4.5" />
                <h2 className="text-base font-semibold">{emptyTitle}</h2>
              </div>
              <p className="text-sm text-slate-500">{emptyDescription}</p>
              <Link href="/dashboard" className={isIOSNativeHost ? 'inline-flex pt-2' : undefined}>
                <Button
                  size="sm"
                  className={
                    isIOSNativeHost
                      ? 'h-10 rounded-full bg-indigo-600 px-4 text-white shadow-[0_12px_26px_rgba(79,70,229,0.2)] hover:bg-indigo-700 cursor-pointer'
                      : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  }
                >
                  {messages.page.backToDashboard}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className={isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-white border-slate-100 shadow-sm'}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className={cn(
                      'text-xs uppercase tracking-[0.16em] text-indigo-400',
                      isIOSNativeHost && IOS_EYEBROW_CLASS,
                    )}
                  >
                    {messages.current.label}
                  </p>
                  <h2
                    className="text-xl font-semibold text-slate-900"
                    data-testid="review-current-title"
                    aria-label="review-current-title"
                  >
                    {currentItem.title}
                  </h2>
                </div>
              </div>

              <div
                className={cn(
                  'flex flex-wrap items-center gap-3 text-sm text-slate-500',
                  isIOSNativeHost && `${IOS_SUBCARD_CLASS} px-3.5 py-3`,
                )}
              >
                {isIOSNativeHost ? <span className={IOS_PILL_CLASS}>{currentModuleLabel}</span> : null}
                <span className="flex items-center gap-1">
                  <Clock3 className="w-4 h-4" />
                  {currentItem.subtitle}
                </span>
              </div>

              <div className={cn('flex gap-3', isIOSNativeHost ? 'flex-col items-start' : 'items-center')}>
                <Link href={currentItem.href}>
                  <Button
                    data-testid="review-open-practice"
                    variant="outline"
                    className={
                      isIOSNativeHost
                        ? `${IOS_TERTIARY_BUTTON_CLASS} h-10 px-4 text-slate-800 cursor-pointer`
                        : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                    }
                  >
                    {fullPracticeLabel}
                  </Button>
                </Link>
                <p className={cn('text-xs text-slate-500', isIOSNativeHost && 'leading-5')}>{messages.current.hint}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={isIOSNativeHost ? IOS_SECTION_CARD_CLASS : 'bg-white border-slate-100 shadow-sm'}>
            <CardContent className="p-6 space-y-4">
              <h3 className={cn('text-sm font-semibold text-slate-900', isIOSNativeHost && IOS_EYEBROW_CLASS)}>
                {messages.upNext.title}
              </h3>
              {upcomingItems.length === 0 ? (
                <div
                  className={
                    isIOSNativeHost
                      ? `${IOS_SUBCARD_CLASS} px-3.5 py-3 text-sm text-slate-500`
                      : 'text-sm text-slate-500'
                  }
                >
                  {messages.upNext.lastItem}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={
                        isIOSNativeHost ? `${IOS_SUBCARD_CLASS} px-3.5 py-3` : 'rounded-lg bg-slate-50 px-3 py-2'
                      }
                    >
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
              <h3 className={cn('text-lg font-semibold text-indigo-900', isIOSNativeHost && 'text-slate-950')}>
                {messages.inline.title}
              </h3>
              <p className={cn('text-sm text-indigo-500', isIOSNativeHost && 'text-slate-500')}>
                {messages.inline.description}
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
            <Card
              data-testid="review-rating-card"
              aria-label="review-rating-card"
              className={isIOSNativeHost ? IOS_TINTED_SUBCARD_CLASS : 'bg-white border-slate-100 shadow-sm'}
            >
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
