'use client';

import { useMemo } from 'react';

interface Props {
  data: { date: string; count: number }[];
  days?: number;
}

function getColor(count: number): string {
  if (count === 0) return 'bg-slate-100';
  if (count === 1) return 'bg-indigo-200';
  if (count <= 3) return 'bg-indigo-400';
  if (count <= 5) return 'bg-indigo-500';
  return 'bg-indigo-700';
}

export function MiniHeatmap({ data, days = 56 }: Props) {
  const recentData = useMemo(() => {
    const slice = data.slice(-days);
    const grid: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];

    const firstDate = slice.length > 0 ? new Date(slice[0].date) : new Date();
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

  if (totalSessions === 0) {
    return <p className="text-xs text-indigo-400 py-2">No activity yet</p>;
  }

  return (
    <div className="flex gap-[2px]">
      {recentData.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[2px]">
          {week.map((d, di) => (
            <div
              key={di}
              className={`w-[10px] h-[10px] rounded-[2px] ${d.count < 0 ? 'bg-transparent' : getColor(d.count)}`}
              title={d.date ? `${d.date}: ${d.count} sessions` : ''}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
