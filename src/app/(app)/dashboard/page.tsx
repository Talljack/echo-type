'use client';

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Flame,
  Hash,
  Headphones,
  Library,
  Mic,
  PenTool,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MiniHeatmap } from '@/components/dashboard/mini-heatmap';
import { MiniModuleBreakdown } from '@/components/dashboard/mini-module-breakdown';
import { MiniReviewForecast } from '@/components/dashboard/mini-review-forecast';
import { TodayPlan } from '@/components/dashboard/today-plan';
import { TodayReviewCard } from '@/components/dashboard/today-review-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getActivityHeatmapData, getReviewForecast, getStreakData } from '@/lib/analytics';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useLanguageStore } from '@/stores/language-store';
import { useProviderStore } from '@/stores/provider-store';
import type { TypingSession } from '@/types/content';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalContent: number;
  totalSessions: number;
  totalWords: number;
  articlesPracticed: number;
  avgAccuracy: number;
  avgWpm: number;
  streak: number;
  sessionsByModule: Record<string, number>;
}

interface RecentItem {
  session: TypingSession;
  contentTitle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number, messages: ReturnType<typeof useI18n<'common'>>['messages']): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return messages.timeAgo.justNow;
  if (mins < 60) return messages.timeAgo.minutesAgo.replace('{{count}}', String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return messages.timeAgo.hoursAgo.replace('{{count}}', String(hrs));
  return messages.timeAgo.daysAgo.replace('{{count}}', String(Math.floor(hrs / 24)));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { messages: dashboard } = useI18n('dashboard');
  const { messages: common } = useI18n('common');
  const [stats, setStats] = useState<Stats>({
    totalContent: 0,
    totalSessions: 0,
    totalWords: 0,
    articlesPracticed: 0,
    avgAccuracy: 0,
    avgWpm: 0,
    streak: 0,
    sessionsByModule: {},
  });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number }[]>([]);
  const [reviewForecastData, setReviewForecastData] = useState<{ date: string; count: number }[]>([]);
  const isNewUser = stats.totalContent === 0;

  const hasProvider = useProviderStore((s) => s.hasAnyProviderConfigured());
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeProviderConnected = useProviderStore((s) => s.isConnected(s.activeProviderId));
  const interfaceLanguage = useLanguageStore((s) => s.interfaceLanguage);
  const hasExplicitPreference = useLanguageStore((s) => s.hasExplicitPreference);
  const initialized = useLanguageStore((s) => s.initialized);

  const { currentLevel, shouldShowReminder, dismissReminder } = useAssessmentStore();
  const showReminder = shouldShowReminder(stats.totalSessions);
  const showAutoLanguageNotice = initialized && !hasExplicitPreference;

  useEffect(() => {
    async function load() {
      const [contents, sessions] = await Promise.all([db.contents.toArray(), db.sessions.toArray()]);

      const completed = sessions.filter((s) => s.completed);
      const sessionsByModule: Record<string, number> = {};
      completed.forEach((s) => {
        const mod = s.module || 'write';
        sessionsByModule[mod] = (sessionsByModule[mod] || 0) + 1;
      });

      const totalWords = completed.reduce((sum, s) => sum + (s.totalWords || 0), 0);
      const articleIds = new Set(contents.filter((c) => c.type === 'article').map((c) => c.id));
      const practicedArticles = new Set(completed.filter((s) => articleIds.has(s.contentId)).map((s) => s.contentId));
      const scored = completed.filter((s) => (s.module || 'write') !== 'listen');
      const avgAccuracy = scored.length > 0 ? scored.reduce((sum, s) => sum + s.accuracy, 0) / scored.length : 0;
      const writes = completed.filter((s) => (s.module || 'write') === 'write');
      const avgWpm = writes.length > 0 ? writes.reduce((sum, s) => sum + s.wpm, 0) / writes.length : 0;

      const [streakData, heatmap, forecast] = await Promise.all([
        getStreakData(),
        getActivityHeatmapData(56),
        getReviewForecast(7),
      ]);

      setHeatmapData(heatmap);
      setReviewForecastData(forecast);

      setStats({
        totalContent: contents.length,
        totalSessions: completed.length,
        totalWords,
        articlesPracticed: practicedArticles.size,
        avgAccuracy: Math.round(avgAccuracy),
        avgWpm: Math.round(avgWpm),
        streak: streakData.current,
        sessionsByModule,
      });

      // Last 5 completed sessions with content title
      const contentMap = new Map(contents.map((c) => [c.id, c.title]));
      const last5 = [...completed]
        .sort((a, b) => (b.endTime ?? b.startTime) - (a.endTime ?? a.startTime))
        .slice(0, 5)
        .map((s) => ({ session: s, contentTitle: contentMap.get(s.contentId) || dashboard.recentActivity.unknown }));
      setRecent(last5);
    }
    load();
  }, [dashboard.recentActivity.unknown]);

  const moduleConfig: Record<string, { label: string; icon: React.ElementType; color: string; href: string }> = {
    listen: {
      label: dashboard.modules.listen.label,
      icon: Headphones,
      color: 'bg-indigo-500',
      href: '/listen',
    },
    speak: { label: dashboard.modules.speak.label, icon: Mic, color: 'bg-green-500', href: '/speak' },
    read: { label: dashboard.modules.read.label, icon: BookOpen, color: 'bg-amber-500', href: '/read' },
    write: { label: dashboard.modules.write.label, icon: PenTool, color: 'bg-purple-500', href: '/write' },
  };

  const statCards = [
    { label: dashboard.stats.content, value: stats.totalContent, icon: Library, accent: 'border-l-slate-300' },
    { label: dashboard.stats.sessions, value: stats.totalSessions, icon: TrendingUp, accent: 'border-l-slate-300' },
    {
      label: dashboard.stats.words,
      value: stats.totalWords.toLocaleString(),
      icon: Hash,
      accent: 'border-l-slate-300',
    },
    { label: dashboard.stats.articles, value: stats.articlesPracticed, icon: FileText, accent: 'border-l-slate-300' },
    {
      label: dashboard.stats.accuracy,
      value: `${stats.avgAccuracy}%`,
      icon: Target,
      accent: 'border-l-emerald-400',
      prominent: true,
    },
    {
      label: dashboard.stats.avgWpm,
      value: stats.avgWpm,
      icon: PenTool,
      accent: 'border-l-indigo-400',
      prominent: true,
    },
  ];

  const modules = [
    {
      href: '/listen',
      key: 'listen',
      label: dashboard.modules.listen.label,
      icon: Headphones,
      desc: dashboard.modules.listen.description,
      color: 'bg-indigo-500',
    },
    {
      href: '/speak',
      key: 'speak',
      label: dashboard.modules.speak.label,
      icon: Mic,
      desc: dashboard.modules.speak.description,
      color: 'bg-green-500',
    },
    {
      href: '/read',
      key: 'read',
      label: dashboard.modules.read.label,
      icon: BookOpen,
      desc: dashboard.modules.read.description,
      color: 'bg-amber-500',
    },
    {
      href: '/write',
      key: 'write',
      label: dashboard.modules.write.label,
      icon: PenTool,
      desc: dashboard.modules.write.description,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">{dashboard.header.title}</h1>
          <p className="text-indigo-600 mt-1">{dashboard.header.subtitle}</p>
        </div>
        {stats.streak > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 px-4 py-2.5 shadow-sm shrink-0">
            <Flame className="w-5 h-5 text-orange-500" />
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600 leading-none">{stats.streak}</p>
              <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">
                {dashboard.stats.streak ?? 'Streak'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showAutoLanguageNotice && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.autoLanguageNotice.title}</p>
            <p className="text-xs text-indigo-600">
              {dashboard.autoLanguageNotice.description.replace(
                '{{language}}',
                common.nativeLanguageNames[interfaceLanguage],
              )}
            </p>
          </div>
          <Link href="/settings">
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer shrink-0"
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              {dashboard.autoLanguageNotice.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            {dashboard.header.analytics} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className={`rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm border-l-3 ${accent}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-indigo-600">{label}</span>
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-indigo-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Provider setup prompt */}
      {!hasProvider && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.aiSetup.title}</p>
            <p className="text-xs text-indigo-500">{dashboard.aiSetup.description}</p>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shrink-0">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiSetup.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Active provider not connected warning */}
      {hasProvider && !activeProviderConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.aiDisconnected.title}</p>
            <p className="text-xs text-indigo-500">
              {dashboard.aiDisconnected.description.replace('{{providerId}}', activeProviderId)}
            </p>
          </div>
          <Link href="/settings">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer shrink-0"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiDisconnected.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* New-user onboarding */}
      {isNewUser && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <BookMarked className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.onboarding.title}</p>
            <p className="text-xs text-indigo-500">{dashboard.onboarding.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/library/wordbooks">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                <BookMarked className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.wordBooks}
              </Button>
            </Link>
            <Link href="/library/import">
              <Button
                size="sm"
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.import}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* First-time assessment prompt */}
      {!currentLevel && !isNewUser && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.assessment.title}</p>
            <p className="text-xs text-indigo-500">{dashboard.assessment.description}</p>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shrink-0">
              <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Re-test reminder */}
      {showReminder && currentLevel && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-900">{dashboard.assessment.reminderTitle}</p>
            <p className="text-xs text-indigo-500">
              {dashboard.assessment.reminderDescription.replace('{{level}}', currentLevel)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/settings">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer">
                <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={dismissReminder}
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
            >
              {common.actions.dismiss}
            </Button>
          </div>
        </div>
      )}

      {/* Mini Analytics */}
      {!isNewUser && (heatmapData.length > 0 || reviewForecastData.length > 0 || stats.totalSessions > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {heatmapData.length > 0 && (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {dashboard.miniAnalytics.activity}
                </CardTitle>
                <Link
                  href="/dashboard/analytics"
                  className="text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5"
                >
                  {dashboard.miniAnalytics.details} <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <MiniHeatmap data={heatmapData} days={56} />
              </CardContent>
            </Card>
          )}
          {reviewForecastData.length > 0 && (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  {dashboard.miniAnalytics.reviewForecast}
                </CardTitle>
                <Link
                  href="/review/today"
                  className="text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-0.5"
                >
                  {dashboard.miniAnalytics.review} <ArrowRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <MiniReviewForecast data={reviewForecastData} />
              </CardContent>
            </Card>
          )}
          {stats.totalSessions > 0 && (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  {dashboard.miniAnalytics.practiceBreakdown}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniModuleBreakdown data={stats.sessionsByModule} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Today Review */}
      <TodayReviewCard />

      {/* Today's Plan */}
      <TodayPlan />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Start Learning */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-indigo-900">{dashboard.sections.startLearning}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <Link key={mod.href} href={mod.href}>
                <Card className="bg-white border-slate-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={`w-11 h-11 rounded-xl ${mod.color} flex items-center justify-center shrink-0`}>
                      <mod.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                        {mod.label}
                      </h3>
                      <p className="text-xs text-indigo-500">{mod.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-indigo-900">{dashboard.sections.recentActivity}</h2>
          {recent.length === 0 ? (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="py-10 flex flex-col items-center justify-center text-center text-indigo-400 text-sm">
                <Clock className="w-8 h-8 mb-2 text-indigo-200" />
                {dashboard.recentActivity.empty}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white gap-0 border-slate-100 shadow-sm divide-y divide-slate-100">
              {recent.map(({ session: s, contentTitle }) => {
                const mod = moduleConfig[s.module || 'write'];
                const Icon = mod?.icon ?? PenTool;
                return (
                  <Link key={s.id} href={`/${s.module === 'speak' ? 'read' : s.module || 'write'}/${s.contentId}`}>
                    <div className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 hover:translate-x-0.5 transition-all duration-200 cursor-pointer group">
                      <div
                        className={`w-8 h-8 rounded-lg ${mod?.color ?? 'bg-indigo-500'} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-900 truncate">{contentTitle}</p>
                        <p className="text-xs text-indigo-400">
                          <span>{mod?.label ?? dashboard.modules.write.label}</span>
                          <span className="mx-1">&middot;</span>
                          <span>{timeAgo(s.endTime ?? s.startTime, common)}</span>
                        </p>
                      </div>
                      {s.accuracy > 0 && (
                        <span
                          className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full ${
                            s.accuracy >= 90
                              ? 'bg-green-100 text-green-700'
                              : s.accuracy >= 70
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {s.accuracy}%
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
