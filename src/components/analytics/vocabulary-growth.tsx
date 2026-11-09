'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  data: { date: string; total: number }[];
}

export function VocabularyGrowth({ data }: Props) {
  const { interfaceLanguage, messages } = useI18n('analytics');
  const copy = messages.charts.vocabularyGrowth;
  const dates = useChartDateFormatters(interfaceLanguage);

  return (
    <AnalyticsCardShell title={copy.title}>
      <>
        {data.length === 0 ? (
          <p className="text-sm text-brand-muted py-8 text-center">{copy.empty}</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={dates.tick} stroke={CHART_COLORS.axis} />
              <YAxis tick={AXIS_TICK} stroke={CHART_COLORS.axis} allowDecimals={false} />
              <Tooltip
                cursor={LINE_CURSOR}
                contentStyle={TOOLTIP_CONTENT_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                labelFormatter={dates.label}
                formatter={
                  ((value: number) => [
                    copy.tooltipValue.replace('{{count}}', String(value)),
                    copy.tooltipLabel,
                  ]) as never
                }
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={CHART_COLORS.series}
                fill={CHART_COLORS.seriesFill}
                strokeWidth={2}
                activeDot={ACTIVE_DOT}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </>
    </AnalyticsCardShell>
  );
}
