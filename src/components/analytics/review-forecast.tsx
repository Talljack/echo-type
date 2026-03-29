'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; count: number }[];
}

export function ReviewForecast({ data }: Props) {
  const { messages } = useI18n('analytics');
  const copy = messages.charts.reviewForecast;
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">
          {copy.title}
          <span className="ml-2 text-xs text-indigo-400 font-normal">
            {copy.summary.replace('{{count}}', String(total))}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-indigo-400 py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                stroke="#94a3b8"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={
                  ((value: number) => [
                    copy.tooltipValue.replace('{{count}}', String(value)),
                    copy.tooltipLabel,
                  ]) as never
                }
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
