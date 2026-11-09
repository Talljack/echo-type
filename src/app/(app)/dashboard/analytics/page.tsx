'use client';

import { ArrowLeft, BarChart3, Flame, PenTool, Target, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/use-analytics';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';

const AccuracyTrendChart = dynamic(() =>
  import('@/components/analytics/accuracy-trend-chart').then((m) => ({ default: m.AccuracyTrendChart })),
);
const ActivityHeatmap = dynamic(() =>
  import('@/components/analytics/activity-heatmap').then((m) => ({ default: m.ActivityHeatmap })),
);
const DailySessionsChart = dynamic(() =>
  import('@/components/analytics/daily-sessions-chart').then((m) => ({ default: m.DailySessionsChart })),
);
const ModuleBreakdown = dynamic(() =>
  import('@/components/analytics/module-breakdown').then((m) => ({ default: m.ModuleBreakdown })),
);
const ReviewForecast = dynamic(() =>
  import('@/components/analytics/review-forecast').then((m) => ({ default: m.ReviewForecast })),
);
const VocabularyGrowth = dynamic(() =>
  import('@/components/analytics/vocabulary-growth').then((m) => ({ default: m.VocabularyGrowth })),
);
const WpmTrendChart = dynamic(() =>
  import('@/components/analytics/wpm-trend-chart').then((m) => ({ default: m.WpmTrendChart })),
);

export default function AnalyticsPage() {
  const { messages } = useI18n('analytics');
  const { messages: common } = useI18n('common');
  const { data, loading, error } = useAnalytics();
  const formatDayUnit = (count: number) => (count === 1 ? common.streak.day : common.streak.days);

  if (loading) {
    return (
      <div className={cn('max-w-6xl mx-auto py-12 text-center text-brand-muted')}>
        <BarChart3 className="w-8 h-8 mx-auto mb-3 animate-pulse text-brand-ink" />
        {messages.page.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('max-w-6xl mx-auto py-12 text-center text-danger')}>
        {messages.page.error.replace('{{message}}', error.message)}
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: messages.page.stats.streak,
      value: messages.page.stats.currentDays
        .replace('{{count}}', String(data.streak.current))
        .replace('{{unit}}', formatDayUnit(data.streak.current)),
      icon: Flame,
      accent: 'border-l-orange-400',
    },
    {
      label: messages.page.stats.totalSessions,
      value: data.totalSessions,
      icon: TrendingUp,
      accent: 'border-l-indigo-400',
    },
    {
      label: messages.page.stats.avgAccuracy,
      value: `${data.avgAccuracy}%`,
      icon: Target,
      accent: 'border-l-emerald-400',
    },
    {
      label: messages.page.stats.avgWpm,
      value: data.avgWpm,
      icon: PenTool,
      accent: 'border-l-purple-400',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-brand-muted hover:text-brand-ink transition-colors"
          aria-label={messages.page.title}
          data-testid="analytics-back-dashboard"
          title={messages.page.title}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink">{messages.page.title}</h1>
          <p className="text-sm text-brand-ink">{messages.page.subtitle}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={cn('grid gap-4', 'grid-cols-2 md:grid-cols-4')}>
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className={`bg-surface border-line shadow-sm border-l-3 ${accent}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-brand-ink">{label}</CardTitle>
              <Icon className="w-4 h-4 text-brand-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-ink">{value}</div>
              {label === messages.page.stats.streak && data.streak.longest > 0 && (
                <p className="text-xs text-brand-muted mt-1">
                  {messages.page.stats.longest
                    .replace('{{count}}', String(data.streak.longest))
                    .replace('{{unit}}', formatDayUnit(data.streak.longest))}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heatmap */}
      <div
        id="analytics-activity-heatmap"
        data-testid="analytics-activity-heatmap"
        role="region"
        aria-label="analytics-activity-heatmap"
      >
        <ActivityHeatmap data={data.heatmap} />
      </div>

      {/* 2-column chart grid */}
      <div
        id="analytics-chart-grid"
        data-testid="analytics-chart-grid"
        role="region"
        aria-label="analytics-chart-grid"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <AccuracyTrendChart data={data.accuracyTrend} />
        <WpmTrendChart data={data.wpmTrend} />
        <DailySessionsChart data={data.dailySessions} />
        <ModuleBreakdown data={data.moduleBreakdown} />
        <VocabularyGrowth data={data.vocabularyGrowth} />
        <ReviewForecast data={data.reviewForecast} />
      </div>
    </div>
  );
}
