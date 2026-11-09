'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; count: number }[];
  days?: number;
}

function getColor(count: number): string {
  if (count === 0) return 'bg-surface-3';
  if (count === 1) return 'bg-brand-line';
  if (count <= 3) return 'bg-brand-muted';
  if (count <= 5) return 'bg-brand';
  return 'bg-brand-strong';
}

export function MiniHeatmap({ data, days = 56 }: Props) {
  const { messages: t, interfaceLanguage } = useI18n('dashboard');
  const recentData = useMemo(() => {
    const slice = data.slice(-days);
    const grid: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];

    const firstDate = slice.length > 0 ? new Date(`${slice[0].date}T00:00:00`) : new Date();
    const startDow = firstDate.getDay();
    for (let i = 0; i < startDow; i++) {
      week.push({ date: '', count: -1 });
    }

    for (const d of slice) {
      week.push(d);
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }
    if (week.length > 0) grid.push(week);
    return grid;
  }, [data, days]);

  const totalSessions = data.slice(-days).reduce((s, d) => s + d.count, 0);
  const activeDays = data.slice(-days).filter((day) => day.count > 0).length;
  const dates = data.slice(-days);
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(interfaceLanguage === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  if (totalSessions === 0) {
    return <p className="py-2 text-xs text-brand-muted">{t.miniAnalytics.noActivity}</p>;
  }

  return (
    <div className="space-y-3" data-testid="activity-summary">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-ink-3">
          {t.miniAnalytics.lastWeeks.replace('{{count}}', String(Math.ceil(days / 7)))}
        </span>
        <span className="font-medium text-ink-2">
          {t.miniAnalytics.activeDays.replace('{{count}}', String(activeDays))}
        </span>
      </div>
      <div className="max-w-full" style={{ width: `${recentData.length * 28 + (recentData.length - 1) * 4}px` }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${recentData.length}, minmax(0, 1fr))` }}>
          {recentData.map((week, wi) => (
            <div key={wi} className="flex min-w-0 flex-col gap-1">
              {week.map((d, di) => (
                <div
                  key={di}
                  className={`aspect-square w-full rounded ${d.count < 0 ? 'bg-transparent' : getColor(d.count)}`}
                  title={d.date ? `${d.date}: ${d.count} ${t.miniAnalytics.sessions}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between gap-2 text-[11px] text-ink-3">
          <time dateTime={dates[0].date}>{formatDate(dates[0].date)}</time>
          <time dateTime={dates[dates.length - 1].date}>{formatDate(dates[dates.length - 1].date)}</time>
        </div>
      </div>
    </div>
  );
}
