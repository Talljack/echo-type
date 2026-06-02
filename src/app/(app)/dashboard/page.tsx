'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  Crosshair,
  FileText,
  Flame,
  Hash,
  Headphones,
  Heart,
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
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import { DashboardMiniAnalytics } from '@/components/dashboard/dashboard-mini-analytics';
import { DashboardModuleGrid, type DashboardModuleItem } from '@/components/dashboard/dashboard-module-grid';
import {
  DashboardRecentActivity,
  type DashboardRecentActivityItem,
} from '@/components/dashboard/dashboard-recent-activity';
import { TodayPlan } from '@/components/dashboard/today-plan';
import { TodayReviewCard } from '@/components/dashboard/today-review-card';
import {
  IOS_PAGE_CONTAINER_CLASS,
  IOS_PILL_CLASS,
  IOS_PRIMARY_BUTTON_CLASS,
  IOS_SECONDARY_BUTTON_CLASS,
  IOS_SUBCARD_CLASS,
  IOSPageHeader,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { getActivityHeatmapData, getReviewForecast, getStreakData } from '@/lib/analytics';
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import { buildDailyPlanGoalExplanation, LEARNING_GOAL_CONFIG, type LearningGoal } from '@/lib/learning-goals';
import { detectIOSNativeHost, nativeHaptic, reportNativeQAState } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useLanguageStore } from '@/stores/language-store';
import { useLearningGoalStore } from '@/stores/learning-goal-store';
import { useProviderStore } from '@/stores/provider-store';
import type { TypingSession } from '@/types/content';

function getNativeHostSearchParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nativeHost');
}

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

interface HorizontalOverflowDiagnostics {
  scrollWidth: number;
  clientWidth: number;
  overflowDelta: number;
  widestElement: string;
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

function collectHorizontalOverflowDiagnostics(): HorizontalOverflowDiagnostics {
  if (typeof document === 'undefined') {
    return { scrollWidth: 0, clientWidth: 0, overflowDelta: 0, widestElement: 'unavailable' };
  }

  const scrollingElement = document.scrollingElement ?? document.documentElement;
  const clientWidth = Math.round(scrollingElement.clientWidth || window.innerWidth || 0);
  const scrollWidth = Math.round(scrollingElement.scrollWidth || 0);
  const viewportWidth = window.innerWidth || clientWidth;
  let widestElement = 'none';
  let maxOverflow = 0;

  for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
    const rect = element.getBoundingClientRect();
    const overflow = rect.right - viewportWidth;
    if (overflow > maxOverflow + 1) {
      const tag = element.tagName.toLowerCase();
      const testId = element.dataset.testid ? `[data-testid=${element.dataset.testid}]` : '';
      const ariaLabel = element.getAttribute('aria-label');
      const className =
        typeof element.className === 'string' ? element.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      widestElement = [tag, testId, ariaLabel ? `[aria=${ariaLabel}]` : '', className ? `.${className}` : '']
        .filter(Boolean)
        .join('');
      maxOverflow = overflow;
    }
  }

  return {
    scrollWidth,
    clientWidth,
    overflowDelta: Math.max(0, Math.round(Math.max(scrollWidth - clientWidth, maxOverflow))),
    widestElement,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { messages: dashboard } = useI18n('dashboard');
  const { messages: common } = useI18n('common');
  const isIOSNativeHost = getNativeHostSearchParam() === 'ios' || detectIOSNativeHost();
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
  const currentGoal = useLearningGoalStore((s) => s.currentGoal);
  const setGoal = useLearningGoalStore((s) => s.setGoal);

  const { currentLevel, shouldShowReminder, dismissReminder } = useAssessmentStore();
  const showReminder = shouldShowReminder(stats.totalSessions);
  const showAutoLanguageNotice = initialized && !hasExplicitPreference;
  const iosNoticeCardClass =
    'rounded-[26px] border border-white/70 bg-white/82 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]';

  useEffect(() => {
    useLearningGoalStore.getState().hydrate();
  }, []);

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
    void load();

    const handleBootstrapReady = () => {
      void load();
    };

    window.addEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    return () => {
      window.removeEventListener('echotype:bootstrap-ready', handleBootstrapReady);
    };
  }, [dashboard.recentActivity.unknown]);

  useEffect(() => {
    const overflowDiagnostics = collectHorizontalOverflowDiagnostics();
    reportNativeQAState({
      page: 'dashboard',
      totalContent: stats.totalContent,
      totalSessions: stats.totalSessions,
      hasProvider,
      activeProviderConnected,
      isNewUser,
      recentCount: recent.length,
      showReminder,
      scrollWidth: overflowDiagnostics.scrollWidth,
      clientWidth: overflowDiagnostics.clientWidth,
      overflowDelta: overflowDiagnostics.overflowDelta,
      widestElement: overflowDiagnostics.widestElement,
    });
  }, [
    activeProviderConnected,
    hasProvider,
    isNewUser,
    recent.length,
    showReminder,
    stats.totalContent,
    stats.totalSessions,
  ]);

  const moduleConfig: Record<string, { label: string; icon: LucideIcon; color: string; href: string }> = {
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

  const iosMoreActions = [
    {
      href: '/library',
      label: 'Library',
      description: `${stats.totalContent} items`,
      icon: Library,
      toneClass: 'bg-indigo-50 text-indigo-600',
    },
    {
      href: '/favorites',
      label: 'Favorites',
      description: 'Saved words',
      icon: Heart,
      toneClass: 'bg-rose-50 text-rose-600',
    },
    {
      href: '/library/import',
      label: 'Import',
      description: 'Add content',
      icon: Upload,
      toneClass: 'bg-cyan-50 text-cyan-600',
    },
    {
      href: '/weak-spots',
      label: 'Weak Spots',
      description: currentGoal ? 'Goal focus' : 'Practice gaps',
      icon: Crosshair,
      toneClass: 'bg-amber-50 text-amber-600',
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      description: stats.totalSessions > 0 ? `${stats.totalSessions} sessions` : 'Progress trends',
      icon: TrendingUp,
      toneClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      href: '/settings',
      label: 'Settings',
      description: 'AI and voice',
      icon: Settings,
      toneClass: 'bg-slate-100 text-slate-600',
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
      colorClass: mod?.color ?? 'bg-indigo-500',
      icon: Icon,
    };
  });

  return (
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'max-w-6xl mx-auto space-y-8'}>
      {/* Header */}
      {isIOSNativeHost ? (
        <IOSPageHeader
          badge="EchoType"
          tone="indigo"
          title={dashboard.header.title}
          description={dashboard.header.subtitle}
          action={<IOSInlineChatButton compact className="shrink-0 self-start" />}
        />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-indigo-900">{dashboard.header.title}</h1>
            <p className="mt-1 text-indigo-600">{dashboard.header.subtitle}</p>
          </div>
          {stats.streak > 0 && (
            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-2.5 shadow-sm">
              <Flame className="w-5 h-5 text-orange-500" />
              <div className="text-right">
                <p className="text-2xl font-bold leading-none text-orange-600">{stats.streak}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-orange-400">
                  {dashboard.stats.streak ?? 'Streak'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {isIOSNativeHost ? (
        <div className="flex flex-wrap items-center gap-2">
          {stats.streak > 0 ? <span className={IOS_PILL_CLASS}>{stats.streak} day streak</span> : null}
          <span className={IOS_PILL_CLASS}>{stats.totalSessions} sessions logged</span>
          <span className={IOS_PILL_CLASS}>{stats.totalContent} learning items</span>
        </div>
      ) : null}

      {isIOSNativeHost ? (
        <div className="space-y-3">
          <div className="px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">More</p>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Quick access</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {iosMoreActions.map(({ href, label, description, icon: Icon, toneClass }) => (
              <Link
                key={href}
                href={href}
                onClick={() => nativeHaptic('light')}
                className={`${IOS_SUBCARD_CLASS} flex min-h-28 flex-col justify-between p-3.5 transition active:scale-[0.98]`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950">{label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {showAutoLanguageNotice && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-2.5'
          }
        >
          <div className="min-w-0 flex-1">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.autoLanguageNotice.title}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-600'}>
              {dashboard.autoLanguageNotice.description.replace(
                '{{language}}',
                common.nativeLanguageNames[interfaceLanguage],
              )}
            </p>
          </div>
          <Link href="/settings" className={isIOSNativeHost ? 'self-start' : ''}>
            <Button
              size="sm"
              variant="outline"
              className={
                isIOSNativeHost
                  ? `${IOS_SECONDARY_BUTTON_CLASS} cursor-pointer`
                  : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer shrink-0'
              }
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              {dashboard.autoLanguageNotice.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className={isIOSNativeHost ? 'space-y-3' : 'space-y-2'}>
        {!isIOSNativeHost && (
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              {dashboard.header.analytics} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <div
          className={
            isIOSNativeHost
              ? 'grid grid-cols-2 gap-3 sm:grid-cols-3'
              : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'
          }
        >
          {statCards.map(({ label, value, icon: Icon, accent }) => (
            <div
              key={label}
              className={
                isIOSNativeHost
                  ? 'rounded-[24px] border border-white/70 bg-white/82 px-4 py-3.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]'
                  : `rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm border-l-3 ${accent}`
              }
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={
                    isIOSNativeHost
                      ? 'text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400'
                      : 'text-xs font-medium text-indigo-600'
                  }
                >
                  {label}
                </span>
                <Icon className={isIOSNativeHost ? 'w-4 h-4 text-slate-400' : 'w-3.5 h-3.5 text-indigo-400'} />
              </div>
              <div
                className={
                  isIOSNativeHost
                    ? 'text-[1.75rem] font-bold tracking-[-0.03em] text-slate-950'
                    : 'text-xl font-bold text-indigo-900'
                }
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Provider setup prompt */}
      {!hasProvider && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3'
          }
        >
          <div
            className={
              isIOSNativeHost
                ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_14px_28px_rgba(99,102,241,0.2)]'
                : 'w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0'
            }
          >
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.aiSetup.title}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
              {dashboard.aiSetup.description}
            </p>
          </div>
          <Link href="/settings" className={isIOSNativeHost ? 'self-start' : ''}>
            <Button
              size="sm"
              className={
                isIOSNativeHost
                  ? `${IOS_PRIMARY_BUTTON_CLASS} bg-violet-600 shadow-[0_12px_26px_rgba(124,58,237,0.22)] hover:bg-violet-700 cursor-pointer`
                  : 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shrink-0'
              }
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiSetup.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Active provider not connected warning */}
      {hasProvider && !activeProviderConnected && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5'
          }
        >
          <div
            className={
              isIOSNativeHost
                ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 shadow-[0_12px_26px_rgba(245,158,11,0.18)]'
                : 'w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0'
            }
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.aiDisconnected.title}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
              {dashboard.aiDisconnected.description.replace('{{providerId}}', activeProviderId)}
            </p>
          </div>
          <Link href="/settings" className={isIOSNativeHost ? 'self-start' : ''}>
            <Button
              size="sm"
              variant="outline"
              className={
                isIOSNativeHost
                  ? 'h-10 rounded-full border border-amber-200 px-4 text-amber-700 hover:bg-amber-50 cursor-pointer'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer shrink-0'
              }
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> {dashboard.aiDisconnected.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* New-user onboarding */}
      {isNewUser && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3'
          }
        >
          <div
            className={
              isIOSNativeHost
                ? 'flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-[0_14px_28px_rgba(79,70,229,0.22)]'
                : 'w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0'
            }
          >
            <BookMarked className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.onboarding.title}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
              {dashboard.onboarding.description}
            </p>
          </div>
          <div className={`flex gap-2 ${isIOSNativeHost ? 'flex-wrap' : 'shrink-0'}`}>
            <Link href="/library/wordbooks">
              <Button
                size="sm"
                className={
                  isIOSNativeHost
                    ? `${IOS_PRIMARY_BUTTON_CLASS} bg-indigo-600 shadow-[0_12px_26px_rgba(79,70,229,0.2)] hover:bg-indigo-700 cursor-pointer`
                    : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                }
              >
                <BookMarked className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.wordBooks}
              </Button>
            </Link>
            <Link href="/library/import">
              <Button
                size="sm"
                variant="outline"
                className={
                  isIOSNativeHost
                    ? `${IOS_SECONDARY_BUTTON_CLASS} cursor-pointer`
                    : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                }
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" /> {dashboard.onboarding.import}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div
        className={
          isIOSNativeHost
            ? `${iosNoticeCardClass} flex flex-col gap-3`
            : 'flex items-center gap-3 rounded-lg border border-indigo-200 bg-white px-4 py-3 shadow-sm'
        }
      >
        <div
          className={
            isIOSNativeHost
              ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600'
          }
        >
          <Crosshair className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
            }
          >
            {currentGoal ? dashboard.learningGoal.currentTitle : dashboard.learningGoal.title}
          </p>
          <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
            {currentGoal
              ? buildDailyPlanGoalExplanation(currentGoal, currentLevel)
              : dashboard.learningGoal.description}
          </p>
        </div>
        {!currentGoal ? (
          <div className={`flex flex-wrap items-center gap-2 ${isIOSNativeHost ? '' : 'justify-end shrink-0'}`}>
            {(Object.keys(LEARNING_GOAL_CONFIG) as LearningGoal[]).map((goalKey) => (
              <Button
                key={goalKey}
                size="sm"
                variant="outline"
                onClick={() => setGoal(goalKey)}
                className={
                  isIOSNativeHost
                    ? 'h-9 rounded-full border-slate-200 px-3 text-slate-700 hover:bg-slate-50 cursor-pointer'
                    : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                }
              >
                {LEARNING_GOAL_CONFIG[goalKey].shortLabel}
              </Button>
            ))}
            {!currentLevel && (
              <Link href="/settings">
                <Button
                  size="sm"
                  className={
                    isIOSNativeHost
                      ? 'h-10 rounded-full bg-indigo-600 px-4 text-white shadow-[0_12px_26px_rgba(79,70,229,0.2)] hover:bg-indigo-700 cursor-pointer'
                      : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  }
                >
                  {dashboard.learningGoal.ctaAssessment}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <Link href="/weak-spots">
            <Button
              size="sm"
              variant="outline"
              className={
                isIOSNativeHost
                  ? 'h-10 rounded-full border-slate-200 px-4 text-slate-700 hover:bg-slate-50'
                  : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
              }
            >
              {dashboard.learningGoal.weakSpots}
            </Button>
          </Link>
        )}
      </div>

      {/* First-time assessment prompt */}
      {!currentLevel && !isNewUser && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5'
          }
        >
          <div
            className={
              isIOSNativeHost
                ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 shadow-[0_12px_26px_rgba(245,158,11,0.18)]'
                : 'w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0'
            }
          >
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.assessment.title}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
              {dashboard.assessment.description}
            </p>
          </div>
          <Link href="/settings" className={isIOSNativeHost ? 'self-start' : ''}>
            <Button
              size="sm"
              className={
                isIOSNativeHost
                  ? 'h-10 rounded-full bg-amber-500 px-4 text-white shadow-[0_12px_26px_rgba(245,158,11,0.18)] hover:bg-amber-600 cursor-pointer'
                  : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shrink-0'
              }
            >
              <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
            </Button>
          </Link>
        </div>
      )}

      {/* Re-test reminder */}
      {showReminder && currentLevel && (
        <div
          className={
            isIOSNativeHost
              ? `${iosNoticeCardClass} flex flex-col gap-3`
              : 'flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5'
          }
        >
          <div
            className={
              isIOSNativeHost
                ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_12px_26px_rgba(16,185,129,0.18)]'
                : 'w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0'
            }
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={
                isIOSNativeHost ? 'text-sm font-semibold text-slate-900' : 'text-sm font-semibold text-indigo-900'
              }
            >
              {dashboard.assessment.reminderTitle}
            </p>
            <p className={isIOSNativeHost ? 'mt-1 text-sm leading-6 text-slate-500' : 'text-xs text-indigo-500'}>
              {dashboard.assessment.reminderDescription.replace('{{level}}', currentLevel)}
            </p>
          </div>
          <div className={`flex gap-2 ${isIOSNativeHost ? 'flex-wrap' : 'shrink-0'}`}>
            <Link href="/settings">
              <Button
                size="sm"
                className={
                  isIOSNativeHost
                    ? 'h-10 rounded-full bg-emerald-500 px-4 text-white shadow-[0_12px_26px_rgba(16,185,129,0.18)] hover:bg-emerald-600 cursor-pointer'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                }
              >
                <Target className="w-3.5 h-3.5 mr-1.5" /> {dashboard.assessment.cta}
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={dismissReminder}
              className={
                isIOSNativeHost
                  ? 'h-10 rounded-full border-emerald-200 px-4 text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer'
              }
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

      {/* Today Review */}
      <TodayReviewCard />

      {/* Today's Plan */}
      <TodayPlan />

      <div
        className={isIOSNativeHost ? 'grid grid-cols-1 gap-5 lg:grid-cols-3' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}
      >
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
