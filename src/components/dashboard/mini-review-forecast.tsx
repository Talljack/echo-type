'use client';

import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';

interface Props {
  data: { date: string; count: number }[];
}

export function MiniReviewForecast({ data }: Props) {
  const { messages: t } = useI18n('dashboard');
  const isIOSNativeHost = detectIOSNativeHost();
  const total = data.reduce((s, d) => s + d.count, 0);
  const today = data[0]?.count ?? 0;
  const max = Math.max(...data.map((d) => d.count), 1);

  if (total === 0) {
    return (
      <p className={isIOSNativeHost ? 'py-2 text-xs text-slate-400' : 'py-2 text-xs text-indigo-400'}>
        {t.miniAnalytics.noUpcomingReviews}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={isIOSNativeHost ? 'text-2xl font-bold text-slate-900' : 'text-2xl font-bold text-indigo-900'}>
          {today}
        </span>
        <span className={isIOSNativeHost ? 'text-xs text-slate-500' : 'text-xs text-indigo-500'}>
          {t.miniAnalytics.dueToday}
        </span>
        <span className={isIOSNativeHost ? 'ml-auto text-xs text-slate-400' : 'ml-auto text-xs text-indigo-400'}>
          {total} {t.miniAnalytics.thisWeek}
        </span>
      </div>
      <div className="flex items-end gap-1 h-8">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={
                isIOSNativeHost
                  ? 'min-h-[2px] w-full rounded-sm bg-indigo-500 transition-all'
                  : 'min-h-[2px] w-full rounded-sm bg-indigo-400 transition-all'
              }
              style={{ height: `${(d.count / max) * 100}%` }}
            />
            <span
              className={
                isIOSNativeHost ? 'text-[9px] leading-none text-slate-400' : 'text-[9px] leading-none text-indigo-400'
              }
            >
              {new Date(d.date).toLocaleDateString('en', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
