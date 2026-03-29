'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; total: number }[];
}

export function VocabularyGrowth({ data }: Props) {
  const { messages } = useI18n('analytics');
  const copy = messages.charts.vocabularyGrowth;

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-indigo-400 py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" />
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
              <Area type="monotone" dataKey="total" stroke="#6366f1" fill="#eef2ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
