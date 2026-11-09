'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnalyticsCardShell } from '@/components/analytics/analytics-card-shell';
import {
  AXIS_TICK,
  BAR_CURSOR,
  CHART_COLORS,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_LABEL_STYLE,
  useChartDateFormatters,
} from '@/components/analytics/chart-theme';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: { date: string; count: number }[];
}

export function ReviewForecast({ data }: Props) {
  const { interfaceLanguage, messages } = useI18n('analytics');
  const copy = messages.charts.reviewForecast;
  const dates = useChartDateFormatters(interfaceLanguage);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <AnalyticsCardShell
      title={copy.title}
      titleSuffix={
        <span className="ml-2 text-xs font-normal text-ink-4">{copy.summary.replace('{{count}}', String(total))}</span>
      }
    >
      <>
        {total === 0 ? (
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
                  ((value: number) => [
                    copy.tooltipValue.replace('{{count}}', String(value)),
                    copy.tooltipLabel,
                  ]) as never
                }
              />
              <Bar dataKey="count" fill={CHART_COLORS.series} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </>
    </AnalyticsCardShell>
  );
}
