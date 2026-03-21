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

export default function AnalyticsPage() {
  const { data, loading, error } = useAnalytics();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-indigo-400">
        <BarChart3 className="w-8 h-8 mx-auto mb-3 animate-pulse" />
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-red-500">Failed to load analytics: {error.message}</div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: 'Streak',
      value: `${data.streak.current} days`,
      icon: Flame,
      accent: 'border-l-orange-400',
    },
    {
      label: 'Total Sessions',
      value: data.totalSessions,
      icon: TrendingUp,
      accent: 'border-l-indigo-400',
    },
    {
      label: 'Avg Accuracy',
      value: `${data.avgAccuracy}%`,
      icon: Target,
      accent: 'border-l-emerald-400',
    },
    {
      label: 'Avg WPM',
      value: data.avgWpm,
      icon: PenTool,
      accent: 'border-l-purple-400',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">Learning Analytics</h1>
          <p className="text-sm text-indigo-500">Track your progress and identify areas to improve</p>
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
              {label === 'Streak' && data.streak.longest > 0 && (
                <p className="text-xs text-indigo-400 mt-1">Longest: {data.streak.longest} days</p>
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
