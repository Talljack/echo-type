'use client';

import { CheckCircle2, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getTodayReviewItems, type TodayReviewItem } from '@/lib/today-review';

export function TodayReviewCard() {
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
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6 text-center text-indigo-400 text-sm">Loading today&apos;s reviews...</CardContent>
      </Card>
    );
  }

  const currentItem = items[0];

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-indigo-900">Today&apos;s Review</h2>
            </div>
            <p className="text-xs leading-relaxed text-indigo-400 max-w-xl">
              Clear due review items here, separately from today&apos;s forward-learning plan below.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-indigo-500 hover:text-indigo-700 cursor-pointer"
            onClick={() => void loadItems()}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          {items.length === 0 ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">No reviews due right now</p>
                <p className="text-xs text-slate-500">
                  Keep going with today&apos;s plan. Due items will appear here automatically.
                </p>
              </div>
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                Clear
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {items.length} item{items.length === 1 ? '' : 's'} due for review
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Review {currentItem?.title} first, or continue the forward-learning plan below when you want something
                  new.
                </p>
              </div>
              <Link href="/review/today">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shrink-0">
                  Open Review
                </Button>
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
