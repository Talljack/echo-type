'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsCardShell } from '@/components/analytics/analytics-card-shell';
import {
  AXIS_TICK,
  BAR_CURSOR,
  CHART_COLORS,
  SKILL_COLORS,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  useChartDateFormatters,
} from '@/components/analytics/chart-theme';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; listen: number; speak: number; read: number; write: number }[];
}

export function DailySessionsChart({ data }: Props) {
  const { interfaceLanguage, messages } = useI18n('analytics');
  const copy = messages.charts.dailySessions;
  const moduleLabels = messages.modules;
  const dates = useChartDateFormatters(interfaceLanguage);
  const hasData = data.some((d) => d.listen + d.speak + d.read + d.write > 0);

  return (
    <AnalyticsCardShell title={copy.title}>
      <>
        {!hasData ? (
          <p className="text-sm text-brand-muted py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dates.tick} stroke={CHART_COLORS.axis} />
              <YAxis tick={AXIS_TICK} stroke={CHART_COLORS.axis} allowDecimals={false} />
              <Tooltip
                cursor={BAR_CURSOR}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                labelFormatter={dates.label}
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
                formatter={(value) => (
                  <span className="text-ink-2">{moduleLabels[value as keyof typeof moduleLabels]}</span>
                )}
              />
              {Object.entries(SKILL_COLORS).map(([mod, color]) => (
                // The surface-coloured outline leaves a gap between stacked segments, so neighbouring skills stay
                // distinguishable even where their hues are close (speak/read for red-green colour blindness).
                <Bar
                  key={mod}
                  dataKey={mod}
                  stackId="a"
                  fill={color}
                  stroke={CHART_COLORS.surface}
                  strokeWidth={1}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </>
    </AnalyticsCardShell>
  );
}
