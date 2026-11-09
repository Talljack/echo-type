'use client';

import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; count: number }[];
}

export function MiniReviewForecast({ data }: Props) {
  const { messages: t } = useI18n('dashboard');
  const total = data.reduce((s, d) => s + d.count, 0);
  const today = data[0]?.count ?? 0;
  const max = Math.max(...data.map((d) => d.count), 1);

  if (total === 0) {
    return <p className="py-2 text-xs text-brand-muted">{t.miniAnalytics.noUpcomingReviews}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-ink">{today}</span>
        <span className="text-xs text-brand-ink">{t.miniAnalytics.dueToday}</span>
        <span className="ml-auto text-xs text-brand-muted">
          {total} {t.miniAnalytics.thisWeek}
        </span>
      </div>
      <div className="flex items-end gap-1 h-8">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="min-h-[2px] w-full rounded-sm bg-brand-muted transition-all"
              style={{ height: `${(d.count / max) * 100}%` }}
            />
            <span className="text-[9px] leading-none text-brand-muted">
              {new Date(d.date).toLocaleDateString('en', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
