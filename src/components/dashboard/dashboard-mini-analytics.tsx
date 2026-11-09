'use client';

import { ArrowRight, Calendar, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { MiniHeatmap } from '@/components/dashboard/mini-heatmap';
import { MiniModuleBreakdown } from '@/components/dashboard/mini-module-breakdown';
import { MiniReviewForecast } from '@/components/dashboard/mini-review-forecast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return (
    <Card className={cn('bg-surface border-line shadow-sm')}>
      <CardHeader className={cn('flex flex-row items-center justify-between pb-2')}>
        <CardTitle className={cn('flex items-center gap-1.5 text-sm font-medium', 'text-brand-ink')}>
          <Icon className={cn('h-4 w-4')} />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn()}>{children}</CardContent>
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
  const linkClass = 'flex items-center gap-0.5 text-xs text-brand-muted hover:text-brand-ink';

  if (!(heatmapData.length > 0 || reviewForecastData.length > 0 || totalSessions > 0)) {
    return null;
  }

  return (
    <div
      data-testid="mini-analytics"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] items-start gap-4 [&>*]:min-w-0 [&>*]:w-full [&>*]:max-w-[26rem]"
    >
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
