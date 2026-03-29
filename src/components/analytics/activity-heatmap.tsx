'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; count: number }[];
}

const CELL_SIZE = 13;
const GAP = 3;
const DAYS_IN_WEEK = 7;
function getColor(count: number): string {
  if (count === 0) return 'bg-slate-100';
  if (count === 1) return 'bg-indigo-200';
  if (count <= 3) return 'bg-indigo-400';
  if (count <= 5) return 'bg-indigo-500';
  return 'bg-indigo-700';
}

export function ActivityHeatmap({ data }: Props) {
  const { messages } = useI18n('analytics');
  const copy = messages.charts.activityHeatmap;
  const labels = copy.dayLabels;

  const weeks = useMemo(() => {
    // Organize into weeks (columns), each with 7 days
    const grid: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];

    // Pad the beginning to align with day of week
    const firstDate = data.length > 0 ? new Date(data[0].date) : new Date();
    const startDow = firstDate.getDay(); // 0=Sun
    for (let i = 0; i < startDow; i++) {
      week.push({ date: '', count: -1 }); // placeholder
    }

    for (const d of data) {
      week.push(d);
      if (week.length === DAYS_IN_WEEK) {
        grid.push(week);
        week = [];
      }
    }
    if (week.length > 0) grid.push(week);
    return grid;
  }, [data]);

  const totalSessions = data.reduce((s, d) => s + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">
          {copy.title}
          <span className="ml-2 text-xs text-indigo-400 font-normal">
            {copy.summary.replace('{{sessions}}', String(totalSessions)).replace('{{days}}', String(activeDays))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col mr-1" style={{ gap: GAP }}>
            {labels.map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-indigo-400"
                style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
              >
                {label}
              </div>
            ))}
          </div>
          {/* Grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`rounded-sm ${day.count < 0 ? 'bg-transparent' : getColor(day.count)}`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={
                    day.count >= 0
                      ? copy.cellTitle
                          .replace('{{date}}', day.date)
                          .replace('{{count}}', String(day.count))
                          .replace('{{sessionLabel}}', day.count === 1 ? copy.session : copy.sessions)
                      : ''
                  }
                />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1 mt-3 text-[10px] text-indigo-400">
          <span>{copy.less}</span>
          {[0, 1, 3, 5, 6].map((c) => (
            <div key={c} className={`rounded-sm ${getColor(c)}`} style={{ width: 10, height: 10 }} />
          ))}
          <span>{copy.more}</span>
        </div>
      </CardContent>
    </Card>
  );
}
