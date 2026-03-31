'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { module: string; sessions: number; time: number }[];
}

const MODULE_COLORS: Record<string, string> = {
  listen: '#6366f1',
  speak: '#22c55e',
  read: '#f59e0b',
  write: '#8b5cf6',
};

function formatTime(ms: number, language: 'en' | 'zh'): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return language === 'zh' ? `${mins} 分钟` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return language === 'zh' ? `${hrs} 小时 ${mins % 60} 分钟` : `${hrs}h ${mins % 60}m`;
}

export function ModuleBreakdown({ data }: Props) {
  const { interfaceLanguage, messages } = useI18n('analytics');
  const copy = messages.charts.moduleBreakdown;
  const moduleLabels = messages.modules;

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-indigo-400 py-8 text-center">{copy.empty}</p>
        ) : (
          <div className="flex items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sessions"
                  nameKey="module"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.map((entry) => (
                    <Cell key={entry.module} fill={MODULE_COLORS[entry.module] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={
                    ((value: number, name: string, props: { payload: { time: number } }) => [
                      copy.tooltipValue
                        .replace('{{count}}', String(value))
                        .replace('{{time}}', formatTime(props.payload.time, interfaceLanguage)),
                      moduleLabels[name as keyof typeof moduleLabels],
                    ]) as never
                  }
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => moduleLabels[value as keyof typeof moduleLabels]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
