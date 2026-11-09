'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsCardShell } from '@/components/analytics/analytics-card-shell';
import {
  ACTIVE_DOT,
  AXIS_TICK,
  CHART_COLORS,
  LINE_CURSOR,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  useChartDateFormatters,
} from '@/components/analytics/chart-theme';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; accuracy: number; module?: string }[];
}

export function AccuracyTrendChart({ data }: Props) {
  const { interfaceLanguage, messages } = useI18n('analytics');
  const copy = messages.charts.accuracyTrend;
  const dates = useChartDateFormatters(interfaceLanguage);
  const filtered = data.filter((d) => d.accuracy > 0);

  return (
    <AnalyticsCardShell title={copy.title}>
      <>
        {filtered.length === 0 ? (
          <p className="text-sm text-brand-muted py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dates.tick} stroke={CHART_COLORS.axis} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} stroke={CHART_COLORS.axis} unit="%" />
              <Tooltip
                cursor={LINE_CURSOR}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                labelFormatter={dates.label}
                formatter={((value: number) => [`${value}%`, copy.tooltipLabel]) as never}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke={CHART_COLORS.series}
                strokeWidth={2}
                dot={false}
                activeDot={ACTIVE_DOT}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </>
    </AnalyticsCardShell>
  );
}
