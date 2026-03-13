'use client';

import { Flame } from 'lucide-react';
import { useEffect } from 'react';
import { useDailyPlanStore } from '@/stores/daily-plan-store';

export function StreakBadge() {
  const { streak, hydrate } = useDailyPlanStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (streak <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
      <Flame className="w-4 h-4" />
      {streak} {streak === 1 ? 'day' : 'days'}
    </span>
  );
}
