'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: { module: string; sessions: number; time: number }[];
}

const MODULE_COLORS: Record<string, string> = {
  listen: '#6366f1',
  speak: '#22c55e',
  read: '#f59e0b',
  write: '#8b5cf6',
};

function formatTime(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function ModuleBreakdown({ data }: Props) {
  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-600">Module Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-indigo-400 py-8 text-center">No session data yet</p>
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
                      `${value} sessions (${formatTime(props.payload.time)})`,
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]) as never
                  }
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
