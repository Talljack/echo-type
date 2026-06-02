'use client';

import { CheckCircle2, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';

export function TodayReviewCard() {
  const { messages } = useI18n('dashboard');
  const { messages: common } = useI18n('common');
  const [items, setItems] = useState<TodayReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isIOSNativeHost = detectIOSNativeHost();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getTodayReviewItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const handleFocus = () => {
      void loadItems();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadItems();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadItems]);

  if (loading) {
    return (
      <Card
        className={
          isIOSNativeHost
            ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
            : 'border-slate-100 bg-white shadow-sm'
        }
      >
        <CardContent
          className={
            isIOSNativeHost ? 'p-6 text-center text-sm text-slate-400' : 'p-6 text-center text-sm text-indigo-400'
          }
        >
          {common.actions.loading}
        </CardContent>
      </Card>
    );
  }

  const currentItem = items[0];

  return (
    <Card
      className={
        isIOSNativeHost
          ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
          : 'border-slate-100 bg-white shadow-sm'
      }
    >
      <CardContent className="p-6">
        <div
          className={`flex items-start gap-4 ${isIOSNativeHost ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'justify-between'}`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={
                  isIOSNativeHost
                    ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_12px_24px_rgba(16,185,129,0.18)]'
                    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500'
                }
              >
                <History className="h-4 w-4 text-white" />
              </div>
              <h2
                className={
                  isIOSNativeHost
                    ? 'text-lg font-semibold tracking-[-0.02em] text-slate-950'
                    : 'text-lg font-semibold text-indigo-900'
                }
              >
                {messages.reviewCard.title}
              </h2>
            </div>
            <p
              className={
                isIOSNativeHost
                  ? 'max-w-xl text-sm leading-6 text-slate-500'
                  : 'max-w-xl text-xs leading-relaxed text-indigo-400'
              }
            >
              {messages.reviewCard.description}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`cursor-pointer ${isIOSNativeHost ? 'h-10 rounded-full border border-slate-200 px-4 text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-indigo-500 hover:text-indigo-700'}`}
            onClick={() => void loadItems()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {common.actions.refresh}
          </Button>
        </div>

        <div
          className={`mt-4 rounded-2xl p-4 ${isIOSNativeHost ? 'border border-slate-100 bg-slate-50/85' : 'bg-slate-50'} flex gap-4 ${isIOSNativeHost ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'items-center justify-between'}`}
        >
          {items.length === 0 ? (
            <>
              <div className="space-y-1">
                <p
                  className={
                    isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-medium text-slate-900'
                  }
                >
                  {messages.reviewCard.noReviewsTitle}
                </p>
                <p className={isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'text-xs text-slate-500'}>
                  {messages.reviewCard.noReviewsDescription}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {common.status.clear}
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 space-y-1">
                <p
                  className={
                    isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-medium text-slate-900'
                  }
                >
                  {messages.reviewCard.itemsDue.replace('{{count}}', String(items.length))}
                </p>
                <p className={isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'truncate text-xs text-slate-500'}>
                  {messages.reviewCard.reviewFirst.replace('{{title}}', currentItem?.title ?? '')}
                </p>
              </div>
              <Link href="/review/today">
                <Button
                  className={`shrink-0 cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600 ${isIOSNativeHost ? 'h-11 rounded-full px-5 text-sm font-semibold shadow-[0_12px_28px_rgba(16,185,129,0.2)]' : ''}`}
                >
                  {messages.reviewCard.openReview}
                </Button>
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
