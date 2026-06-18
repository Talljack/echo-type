'use client';

import { Flame } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { shiftLocalDateKey } from '@/lib/date-key';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { useDailyPlanStore } from '@/stores/daily-plan-store';

export function StreakBadge() {
  const { streak, lastActiveDate, hydrate } = useDailyPlanStore();
  const { interfaceLanguage, messages } = useI18n('common');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const hasContinuousStreak = useMemo(() => {
    if (streak <= 0) return false;
    const today = shiftLocalDateKey(0);
    const yesterday = shiftLocalDateKey(-1);
    return lastActiveDate === today || lastActiveDate === yesterday;
  }, [lastActiveDate, streak]);

  const displayStreak = hasContinuousStreak ? streak : 0;
  const suffix = displayStreak === 1 ? messages.streak.day : messages.streak.days;
  const label = interfaceLanguage === 'zh' ? `${displayStreak}${suffix}` : `${displayStreak} ${suffix}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold',
        hasContinuousStreak ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400',
      )}
      title={hasContinuousStreak ? undefined : 'Complete today to start a streak'}
    >
      <Flame className="h-4 w-4" />
      {label}
    </span>
  );
}
