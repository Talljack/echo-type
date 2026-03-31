'use client';

import { Flame } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useDailyPlanStore } from '@/stores/daily-plan-store';

export function StreakBadge() {
  const { streak, hydrate } = useDailyPlanStore();
  const { interfaceLanguage, messages } = useI18n('common');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (streak <= 0) return null;

  const suffix = streak === 1 ? messages.streak.day : messages.streak.days;
  const label = interfaceLanguage === 'zh' ? `${streak}${suffix}` : `${streak} ${suffix}`;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-sm font-semibold text-orange-700">
      <Flame className="h-4 w-4" />
      {label}
    </span>
  );
}
