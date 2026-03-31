'use client';

import { CheckCircle2, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';

export function TodayReviewCard() {
  const { messages } = useI18n('dashboard');
  const { messages: common } = useI18n('common');
  const [items, setItems] = useState<TodayReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      <Card className="border-slate-100 bg-white shadow-sm">
        <CardContent className="p-6 text-center text-sm text-indigo-400">{common.actions.loading}</CardContent>
      </Card>
    );
  }

  const currentItem = items[0];

  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                <History className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-indigo-900">{messages.reviewCard.title}</h2>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-indigo-400">{messages.reviewCard.description}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="cursor-pointer text-indigo-500 hover:text-indigo-700"
            onClick={() => void loadItems()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            {common.actions.refresh}
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          {items.length === 0 ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">{messages.reviewCard.noReviewsTitle}</p>
                <p className="text-xs text-slate-500">{messages.reviewCard.noReviewsDescription}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {common.status.clear}
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  {messages.reviewCard.itemsDue.replace('{{count}}', String(items.length))}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {messages.reviewCard.reviewFirst.replace('{{title}}', currentItem?.title ?? '')}
                </p>
              </div>
              <Link href="/review/today">
                <Button className="shrink-0 cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600">
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
