'use client';

interface Props {
  data: { date: string; count: number }[];
}

export function MiniReviewForecast({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const today = data[0]?.count ?? 0;
  const max = Math.max(...data.map((d) => d.count), 1);

  if (total === 0) {
    return <p className="text-xs text-indigo-400 py-2">No upcoming reviews</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-indigo-900">{today}</span>
        <span className="text-xs text-indigo-500">due today</span>
        <span className="text-xs text-indigo-400 ml-auto">{total} this week</span>
      </div>
      <div className="flex items-end gap-1 h-8">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-sm bg-indigo-400 min-h-[2px] transition-all"
              style={{ height: `${(d.count / max) * 100}%` }}
            />
            <span className="text-[9px] text-indigo-400 leading-none">
              {new Date(d.date).toLocaleDateString('en', { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
