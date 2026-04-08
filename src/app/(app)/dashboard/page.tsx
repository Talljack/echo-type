'use client';

import {
  BookMarked,
  BookOpen,
  Clock,
  FileText,
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
import { TodayPlan } from '@/components/dashboard/today-plan';
import { TodayReviewCard } from '@/components/dashboard/today-review-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    sessionsByModule: {},
  });
  const [recent, setRecent] = useState<RecentItem[]>([]);
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

      setStats({
        totalContent: contents.length,
        totalSessions: completed.length,
        totalWords,
        articlesPracticed: practicedArticles.size,
        avgAccuracy: Math.round(avgAccuracy),
        avgWpm: Math.round(avgWpm),
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
      <div>
        <h1 className="text-3xl font-bold text-indigo-900">{dashboard.header.title}</h1>
        <p className="text-indigo-600 mt-1">{dashboard.header.subtitle}</p>
      </div>

      {showAutoLanguageNotice && (
        <Card className="border-indigo-200 bg-linear-to-br from-indigo-50 via-white to-violet-50 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-900">{dashboard.autoLanguageNotice.title}</p>
              <p className="text-sm text-indigo-600">
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
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
              >
                <Settings className="mr-1.5 h-4 w-4" />
                {dashboard.autoLanguageNotice.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div />
        <Link
          href="/dashboard/analytics"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
        >
          {dashboard.header.analytics} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, accent, prominent }) => (
          <Card key={label} className={`bg-white border-slate-100 shadow-sm border-l-3 ${accent}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-indigo-600">{label}</CardTitle>
              <Icon className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className={`font-bold text-indigo-900 ${prominent ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Provider setup prompt */}
      {!hasProvider && (
        <Card className="bg-linear-to-br from-violet-50 via-indigo-50 to-white border-violet-200 shadow-md">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">{dashboard.aiSetup.title}</p>
              <p className="text-sm text-indigo-500 mt-0.5">{dashboard.aiSetup.description}</p>
            </div>
            <Link href="/settings">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-sm">
                <Settings className="w-4 h-4 mr-1.5" /> {dashboard.aiSetup.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active provider not connected warning */}
      {hasProvider && !activeProviderConnected && (
        <Card className="bg-linear-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900 text-sm">{dashboard.aiDisconnected.title}</p>
              <p className="text-xs text-indigo-500 mt-0.5">
                {dashboard.aiDisconnected.description.replace('{{providerId}}', activeProviderId)}
              </p>
            </div>
            <Link href="/settings">
              <Button
                size="sm"
                variant="outline"
                className="border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-1.5" /> {dashboard.aiDisconnected.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* New-user onboarding */}
      {isNewUser && (
        <Card className="bg-linear-to-br from-indigo-50 to-white border-indigo-200">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <BookMarked className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">{dashboard.onboarding.title}</p>
              <p className="text-sm text-indigo-500 mt-0.5">{dashboard.onboarding.description}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/library/wordbooks">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                  <BookMarked className="w-4 h-4 mr-1.5" /> {dashboard.onboarding.wordBooks}
                </Button>
              </Link>
              <Link href="/library/import">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-1.5" /> {dashboard.onboarding.import}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* First-time assessment prompt */}
      {!currentLevel && !isNewUser && (
        <Card className="bg-linear-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">{dashboard.assessment.title}</p>
              <p className="text-sm text-indigo-500 mt-0.5">{dashboard.assessment.description}</p>
            </div>
            <Link href="/settings">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer">
                <Target className="w-4 h-4 mr-1.5" /> {dashboard.assessment.cta}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Re-test reminder */}
      {showReminder && currentLevel && (
        <Card className="bg-linear-to-br from-emerald-50 to-white border-emerald-200">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">{dashboard.assessment.reminderTitle}</p>
              <p className="text-sm text-indigo-500 mt-0.5">
                {dashboard.assessment.reminderDescription.replace('{{level}}', currentLevel)}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/settings">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer">
                  <Target className="w-4 h-4 mr-1.5" /> {dashboard.assessment.cta}
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
          </CardContent>
        </Card>
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
