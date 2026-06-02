'use client';

import { ArrowRight, Calendar, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { MiniHeatmap } from '@/components/dashboard/mini-heatmap';
import { MiniModuleBreakdown } from '@/components/dashboard/mini-module-breakdown';
import { MiniReviewForecast } from '@/components/dashboard/mini-review-forecast';
import { IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';

interface DashboardMiniAnalyticsMessages {
  activity: string;
  details: string;
  reviewForecast: string;
  review: string;
  practiceBreakdown: string;
}

interface DashboardMiniAnalyticsProps {
  messages: DashboardMiniAnalyticsMessages;
  heatmapData: { date: string; count: number }[];
  reviewForecastData: { date: string; count: number }[];
  sessionsByModule: Record<string, number>;
  totalSessions: number;
}

function MiniAnalyticsCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isIOSNativeHost = detectIOSNativeHost();

  return (
    <Card
      className={cn(
        isIOSNativeHost
          ? `${IOS_SECTION_CARD_CLASS} gap-0 border-white/75 bg-white/82 py-0`
          : 'bg-white border-slate-100 shadow-sm',
      )}
    >
      <CardHeader
        className={cn('flex flex-row items-center justify-between pb-2', isIOSNativeHost && 'px-5 pt-5 pb-3')}
      >
        <CardTitle
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            isIOSNativeHost ? 'text-slate-700' : 'text-indigo-600',
          )}
        >
          <Icon className={cn('h-4 w-4', isIOSNativeHost ? 'text-slate-400' : undefined)} />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn(isIOSNativeHost && 'px-5 pb-5')}>{children}</CardContent>
    </Card>
  );
}

export function DashboardMiniAnalytics({
  messages,
  heatmapData,
  reviewForecastData,
  sessionsByModule,
  totalSessions,
}: DashboardMiniAnalyticsProps) {
  const isIOSNativeHost = detectIOSNativeHost();
  const linkClass = isIOSNativeHost
    ? 'flex items-center gap-0.5 text-xs text-slate-400 transition-colors hover:text-slate-600'
    : 'flex items-center gap-0.5 text-xs text-indigo-400 hover:text-indigo-600';

  if (!(heatmapData.length > 0 || reviewForecastData.length > 0 || totalSessions > 0)) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {heatmapData.length > 0 && (
        <MiniAnalyticsCard
          title={messages.activity}
          icon={Calendar}
          action={
            <Link href="/dashboard/analytics" className={linkClass}>
              {messages.details} <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <MiniHeatmap data={heatmapData} days={56} />
        </MiniAnalyticsCard>
      )}
      {reviewForecastData.length > 0 && (
        <MiniAnalyticsCard
          title={messages.reviewForecast}
          icon={Target}
          action={
            <Link href="/review/today" className={linkClass}>
              {messages.review} <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <MiniReviewForecast data={reviewForecastData} />
        </MiniAnalyticsCard>
      )}
      {totalSessions > 0 && (
        <MiniAnalyticsCard title={messages.practiceBreakdown} icon={TrendingUp}>
          <MiniModuleBreakdown data={sessionsByModule} />
        </MiniAnalyticsCard>
      )}
    </div>
  );
}
