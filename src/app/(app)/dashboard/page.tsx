'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
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
import { DashboardMiniAnalytics } from '@/components/dashboard/dashboard-mini-analytics';
import { DashboardModuleGrid, type DashboardModuleItem } from '@/components/dashboard/dashboard-module-grid';
import {
  DashboardRecentActivity,
  type DashboardRecentActivityItem,
} from '@/components/dashboard/dashboard-recent-activity';
import { TodayWorkspace } from '@/components/learning/today-workspace';
import { Button } from '@/components/ui/button';
import { buildActivityHeatmapData, buildReviewForecast, buildStreakData } from '@/lib/analytics';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useLanguageStore } from '@/stores/language-store';
import { useLearningGoalStore } from '@/stores/learning-goal-store';
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

  const providerHydrated = useProviderStore((s) => s.hydrated);
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
    useLearningGoalStore.getState().hydrate();
  }, []);

  useEffect(() => {
    async function load() {
      const [contents, sessions, records] = await Promise.all([
        db.contents.toArray(),
        db.sessions.toArray(),
        db.records.toArray(),
      ]);

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

      const streakData = buildStreakData(sessions);
      const heatmap = buildActivityHeatmapData(sessions, 56);
      const forecast = buildReviewForecast(records, 7);

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
    void load();

    const handleBootstrapReady = () => {
      void load();
    };

    window.addEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    return () => {
      window.removeEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    };
  }, [dashboard.recentActivity.unknown]);

  const moduleConfig: Record<string, { label: string; icon: LucideIcon; color: string; href: string }> = {
    listen: {
      label: dashboard.modules.listen.label,
      icon: Headphones,
      color: 'bg-brand',
      href: '/listen',
    },
    speak: { label: dashboard.modules.speak.label, icon: Mic, color: 'bg-success', href: '/speak' },
    read: { label: dashboard.modules.read.label, icon: BookOpen, color: 'bg-warning', href: '/read' },
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

  const modules: Array<{
    href: string;
    key: DashboardModuleItem['icon'];
    label: string;
    icon: LucideIcon;
    desc: string;
    color: string;
  }> = [
    {
      href: '/listen',
      key: 'listen',
      label: dashboard.modules.listen.label,
      icon: Headphones,
      desc: dashboard.modules.listen.description,
      color: 'bg-brand',
    },
    {
      href: '/speak',
      key: 'speak',
      label: dashboard.modules.speak.label,
      icon: Mic,
      desc: dashboard.modules.speak.description,
      color: 'bg-success',
    },
    {
      href: '/read',
      key: 'read',
      label: dashboard.modules.read.label,
      icon: BookOpen,
      desc: dashboard.modules.read.description,
      color: 'bg-warning',
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

  const moduleGridItems: DashboardModuleItem[] = modules.map((mod) => ({
    href: mod.href,
    label: mod.label,
    desc: mod.desc,
    color: mod.color,
    icon: mod.key,
  }));

  const recentActivityItems: DashboardRecentActivityItem[] = recent.map(({ session: s, contentTitle }) => {
    const mod = moduleConfig[s.module || 'write'];
    const Icon = mod?.icon ?? PenTool;
    return {
      id: s.id,
      href: `/${s.module === 'speak' ? 'read' : s.module || 'write'}/${s.contentId}`,
      title: contentTitle,
      subtitle: `${mod?.label ?? dashboard.modules.write.label} · ${timeAgo(s.endTime ?? s.startTime, common)}`,
      accuracy: s.accuracy,
      colorClass: mod?.color ?? 'bg-brand',
      icon: Icon,
    };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[36px]">
            {dashboard.header.title}
          </h1>
          <p className="mt-1 text-[15px] text-ink-3">{dashboard.header.subtitle}</p>
        </div>
        {stats.streak > 0 && (
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-speak-soft px-3.5 py-1.5 text-speak-ink">
            <Flame className="size-4" />
            <span className="font-display text-lg font-bold leading-none tabular-nums">{stats.streak}</span>
            <span className="text-xs font-medium">{dashboard.stats.streak ?? 'Streak'}</span>
          </div>
        )}
      </header>
      <TodayWorkspace />

      {showAutoLanguageNotice && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-line bg-brand-soft/60 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{dashboard.autoLanguageNotice.title}</p>
            <p className="text-xs text-brand-ink">
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
              className="border-brand-line text-brand-ink hover:bg-brand-soft cursor-pointer shrink-0"
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
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-ink hover:text-brand-ink hover:bg-brand-soft transition-colors"
          >
            {dashboard.header.analytics} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className={`rounded-lg border border-line bg-surface px-3 py-2.5 shadow-sm border-l-3 ${accent}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-brand-ink">{label}</span>
                <Icon className="w-3.5 h-3.5 text-brand-muted" />
              </div>
              <div className="text-xl font-bold text-ink">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Provider setup prompt */}
      {providerHydrated && !hasProvider && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-brand-soft px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-brand flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{dashboard.aiSetup.title}</p>
            <p className="text-xs text-brand-ink">{dashboard.aiSetup.description}</p>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shrink-0">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiSetup.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Active provider not connected warning */}
      {providerHydrated && hasProvider && !activeProviderConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-warning-line bg-warning-soft/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{dashboard.aiDisconnected.title}</p>
            <p className="text-xs text-brand-ink">
              {dashboard.aiDisconnected.description.replace('{{providerId}}', activeProviderId)}
            </p>
          </div>
          <Link href="/settings">
            <Button
              size="sm"
              variant="outline"
              className="border-warning-line text-warning-ink hover:bg-warning-soft cursor-pointer shrink-0"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiDisconnected.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* New-user onboarding */}
      {isNewUser && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-line bg-brand-soft/60 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <BookMarked className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{dashboard.onboarding.title}</p>
            <p className="text-xs text-brand-ink">{dashboard.onboarding.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/library/wordbooks">
              <Button size="sm" className="bg-brand hover:bg-brand-strong cursor-pointer">
                <BookMarked className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.wordBooks}
              </Button>
            </Link>
            <Link href="/library/import">
              <Button
                size="sm"
                variant="outline"
                className="border-brand-line text-brand-ink hover:bg-brand-soft cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.import}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* First-time assessment prompt */}
      {!currentLevel && !isNewUser && (
        <div className="flex items-center gap-3 rounded-lg border border-warning-line bg-warning-soft/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{dashboard.assessment.title}</p>
            <p className="text-xs text-brand-ink">{dashboard.assessment.description}</p>
          </div>
          <Link href="/settings">
            <Button size="sm" className="bg-warning hover:bg-warning text-on-fill cursor-pointer shrink-0">
              <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Re-test reminder */}
      {showReminder && currentLevel && (
        <div className="flex items-center gap-3 rounded-lg border border-success-line bg-success-soft/60 px-4 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{dashboard.assessment.reminderTitle}</p>
            <p className="text-xs text-brand-ink">
              {dashboard.assessment.reminderDescription.replace('{{level}}', currentLevel)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/settings">
              <Button size="sm" className="bg-success hover:bg-success text-on-fill cursor-pointer">
                <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={dismissReminder}
              className="border-success-line text-success hover:bg-success-soft cursor-pointer"
            >
              {common.actions.dismiss}
            </Button>
          </div>
        </div>
      )}

      {/* Mini Analytics */}
      {!isNewUser && (
        <DashboardMiniAnalytics
          messages={dashboard.miniAnalytics}
          heatmapData={heatmapData}
          reviewForecastData={reviewForecastData}
          sessionsByModule={stats.sessionsByModule}
          totalSessions={stats.totalSessions}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardModuleGrid title={dashboard.sections.startLearning} modules={moduleGridItems} />

        <DashboardRecentActivity
          title={dashboard.sections.recentActivity}
          emptyLabel={dashboard.recentActivity.empty}
          items={recentActivityItems}
        />
      </div>
    </div>
  );
}
