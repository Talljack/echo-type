'use client';

import { ArrowLeft, BarChart3, Flame, PenTool, Target, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import {
  IOS_PAGE_CONTAINER_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/use-analytics';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost, nativeHaptic, reportNativeQAState } from '@/lib/tauri';
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
  const isIOSNativeHost = detectIOSNativeHost();
  const formatDayUnit = (count: number) => (count === 1 ? common.streak.day : common.streak.days);

  useEffect(() => {
    reportNativeQAState({
      page: 'dashboard-analytics',
      loading,
      hasData: Boolean(data),
      totalSessions: data?.totalSessions ?? 0,
    });
  }, [data, loading]);

  if (loading) {
    return (
      <div
        className={cn(
          isIOSNativeHost
            ? `${IOS_PAGE_CONTAINER_CLASS} py-12 text-center text-slate-500`
            : 'max-w-6xl mx-auto py-12 text-center text-indigo-400',
        )}
      >
        <BarChart3 className="w-8 h-8 mx-auto mb-3 animate-pulse text-indigo-500" />
        {messages.page.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          isIOSNativeHost
            ? `${IOS_PAGE_CONTAINER_CLASS} py-12 text-center text-red-500`
            : 'max-w-6xl mx-auto py-12 text-center text-red-500',
        )}
      >
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
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'max-w-6xl mx-auto space-y-6'}>
      {/* Header */}
      {isIOSNativeHost ? (
        <IOSPageHeader
          icon={BarChart3}
          tone="indigo"
          badge="Analytics"
          title={messages.page.title}
          description={messages.page.subtitle}
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/dashboard" onClick={() => nativeHaptic('light')}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(IOS_TERTIARY_BUTTON_CLASS, 'h-10 w-10 px-0')}
                  aria-label={messages.page.title}
                  data-testid="analytics-back-dashboard"
                  title={messages.page.title}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <IOSInlineChatButton iconOnly />
            </div>
          }
        />
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-indigo-400 hover:text-indigo-600 transition-colors"
            aria-label={messages.page.title}
            data-testid="analytics-back-dashboard"
            title={messages.page.title}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">{messages.page.title}</h1>
            <p className="text-sm text-indigo-500">{messages.page.subtitle}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div
        className={cn(
          'grid gap-4',
          isIOSNativeHost ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4',
        )}
      >
        {statCards.map(({ label, value, icon: Icon, accent }) =>
          isIOSNativeHost ? (
            <div
              key={label}
              data-testid={`analytics-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`${IOS_SUBCARD_CLASS} px-4 py-3.5`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-[1.55rem] font-bold tracking-[-0.03em] text-slate-950">{value}</div>
              {label === messages.page.stats.streak && data.streak.longest > 0 && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {messages.page.stats.longest
                    .replace('{{count}}', String(data.streak.longest))
                    .replace('{{unit}}', formatDayUnit(data.streak.longest))}
                </p>
              )}
            </div>
          ) : (
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
          ),
        )}
      </div>

      {/* Heatmap */}
      <div data-testid="analytics-activity-heatmap">
        <ActivityHeatmap data={data.heatmap} />
      </div>

      {/* 2-column chart grid */}
      <div data-testid="analytics-chart-grid" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
