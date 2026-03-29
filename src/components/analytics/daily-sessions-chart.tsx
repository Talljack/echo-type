'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; listen: number; speak: number; read: number; write: number }[];
}

const MODULE_COLORS: Record<string, string> = {
  listen: '#6366f1',
  speak: '#22c55e',
  read: '#f59e0b',
  write: '#8b5cf6',
};

export function DailySessionsChart({ data }: Props) {
  const { messages } = useI18n('analytics');
  const copy = messages.charts.dailySessions;
  const moduleLabels = messages.modules;
  const hasData = data.some((d) => d.listen + d.speak + d.read + d.write > 0);

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-indigo-400 py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={
                  ((value: number, name: string) => [
                    String(value),
                    moduleLabels[name as keyof typeof moduleLabels],
                  ]) as never
                }
              />
              <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => moduleLabels[value as keyof typeof moduleLabels]}
              />
              {Object.entries(MODULE_COLORS).map(([mod, color]) => (
                <Bar key={mod} dataKey={mod} stackId="a" fill={color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
