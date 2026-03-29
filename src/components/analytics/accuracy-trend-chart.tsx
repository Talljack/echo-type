'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; accuracy: number; module?: string }[];
}

export function AccuracyTrendChart({ data }: Props) {
  const { messages } = useI18n('analytics');
  const copy = messages.charts.accuracyTrend;
  const filtered = data.filter((d) => d.accuracy > 0);

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-indigo-400 py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={((value: number) => [`${value}%`, copy.tooltipLabel]) as never}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
