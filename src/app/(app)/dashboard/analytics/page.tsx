'use client';

import { ArrowLeft, BarChart3, Flame, PenTool, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { AccuracyTrendChart } from '@/components/analytics/accuracy-trend-chart';
import { ActivityHeatmap } from '@/components/analytics/activity-heatmap';
import { DailySessionsChart } from '@/components/analytics/daily-sessions-chart';
import { ModuleBreakdown } from '@/components/analytics/module-breakdown';
import { ReviewForecast } from '@/components/analytics/review-forecast';
import { VocabularyGrowth } from '@/components/analytics/vocabulary-growth';
import { WpmTrendChart } from '@/components/analytics/wpm-trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/use-analytics';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function AnalyticsPage() {
  const { messages } = useI18n('analytics');
  const { messages: common } = useI18n('common');
  const { data, loading, error } = useAnalytics();
  const formatDayUnit = (count: number) => (count === 1 ? common.streak.day : common.streak.days);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-indigo-400">
        <BarChart3 className="w-8 h-8 mx-auto mb-3 animate-pulse" />
        {messages.page.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-red-500">
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
          className="text-indigo-400 hover:text-indigo-600 transition-colors"
          aria-label={messages.page.title}
          title={messages.page.title}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{messages.page.title}</h1>
          <p className="text-sm text-indigo-500">{messages.page.subtitle}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className={`bg-white border-slate-100 shadow-sm border-l-3 ${accent}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-indigo-600">{label}</CardTitle>
              <Icon className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">{value}</div>
              {label === messages.page.stats.streak && data.streak.longest > 0 && (
                <p className="text-xs text-indigo-400 mt-1">
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
      <ActivityHeatmap data={data.heatmap} />

      {/* 2-column chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
