'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalyticsCardShell } from '@/components/analytics/analytics-card-shell';
import {
  CHART_COLORS,
  SKILL_COLORS,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
} from '@/components/analytics/chart-theme';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { module: string; sessions: number; time: number }[];
}

const MODULE_COLORS: Record<string, string> = SKILL_COLORS;

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
    <AnalyticsCardShell title={copy.title}>
      <>
        {data.length === 0 ? (
          <p className="text-sm text-brand-muted py-8 text-center">{copy.empty}</p>
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
                  stroke={CHART_COLORS.surface}
                >
                  {data.map((entry) => (
                    <Cell key={entry.module} fill={MODULE_COLORS[entry.module] || CHART_COLORS.neutral} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
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
                  formatter={(value) => (
                    <span className="text-ink-2">{moduleLabels[value as keyof typeof moduleLabels]}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </>
    </AnalyticsCardShell>
  );
}
