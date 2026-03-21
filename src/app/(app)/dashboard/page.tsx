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
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TodayPlan } from '@/components/dashboard/today-plan';
import { TodayReviewCard } from '@/components/dashboard/today-review-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { CEFR_LABELS, type CEFRLevel, useAssessmentStore } from '@/stores/assessment-store';
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

const moduleConfig: Record<string, { label: string; icon: React.ElementType; color: string; href: string }> = {
  listen: { label: 'Listen', icon: Headphones, color: 'bg-indigo-500', href: '/listen' },
  speak: { label: 'Speak', icon: Mic, color: 'bg-green-500', href: '/speak' },
  read: { label: 'Read', icon: BookOpen, color: 'bg-amber-500', href: '/read' },
  write: { label: 'Write', icon: PenTool, color: 'bg-purple-500', href: '/write' },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
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

  const { currentLevel, shouldShowReminder, dismissReminder } = useAssessmentStore();
  const showReminder = shouldShowReminder(stats.totalSessions);

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
        .map((s) => ({ session: s, contentTitle: contentMap.get(s.contentId) || 'Unknown' }));
      setRecent(last5);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Content', value: stats.totalContent, icon: Library, accent: 'border-l-slate-300' },
    { label: 'Sessions', value: stats.totalSessions, icon: TrendingUp, accent: 'border-l-slate-300' },
    { label: 'Words', value: stats.totalWords.toLocaleString(), icon: Hash, accent: 'border-l-slate-300' },
    { label: 'Articles', value: stats.articlesPracticed, icon: FileText, accent: 'border-l-slate-300' },
    {
      label: 'Accuracy',
      value: `${stats.avgAccuracy}%`,
      icon: Target,
      accent: 'border-l-emerald-400',
      prominent: true,
    },
    { label: 'Avg WPM', value: stats.avgWpm, icon: PenTool, accent: 'border-l-indigo-400', prominent: true },
  ];

  const modules = [
    {
      href: '/listen',
      key: 'listen',
      label: 'Listen',
      icon: Headphones,
      desc: 'Listen with TTS',
      color: 'bg-indigo-500',
    },
    {
      href: '/speak',
      key: 'speak',
      label: 'Speak',
      icon: Mic,
      desc: 'Read aloud, get feedback',
      color: 'bg-green-500',
    },
    { href: '/read', key: 'read', label: 'Read', icon: BookOpen, desc: 'Reading comprehension', color: 'bg-amber-500' },
    { href: '/write', key: 'write', label: 'Write', icon: PenTool, desc: 'Typing practice', color: 'bg-purple-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-indigo-900">Welcome to EchoType</h1>
        <p className="text-indigo-600 mt-1">Master English through listening, speaking, reading & writing</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div />
        <Link
          href="/dashboard/analytics"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
        >
          View Analytics <span aria-hidden="true">&rarr;</span>
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

      {/* New-user onboarding */}
      {isNewUser && (
        <Card className="bg-linear-to-br from-indigo-50 to-white border-indigo-200">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <BookMarked className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-indigo-900">Get started in seconds</p>
              <p className="text-sm text-indigo-500 mt-0.5">
                Browse our built-in word books and scenario packs — or import your own content.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/library/wordbooks">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                  <BookMarked className="w-4 h-4 mr-1.5" /> Word Books
                </Button>
              </Link>
              <Link href="/library/import">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-1.5" /> Import
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
              <p className="font-semibold text-indigo-900">Assess your English level</p>
              <p className="text-sm text-indigo-500 mt-0.5">
                Take a quick 15-question test to get personalized learning recommendations based on your CEFR level.
              </p>
            </div>
            <Link href="/settings">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer">
                <Target className="w-4 h-4 mr-1.5" /> Take Assessment
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
              <p className="font-semibold text-indigo-900">Time to re-assess your level!</p>
              <p className="text-sm text-indigo-500 mt-0.5">
                You&apos;ve completed 50+ sessions since your last assessment ({CEFR_LABELS[currentLevel as CEFRLevel]}
                ). Ready to check your progress?
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/settings">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer">
                  <Target className="w-4 h-4 mr-1.5" /> Take Assessment
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={dismissReminder}
                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
              >
                Dismiss
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
          <h2 className="text-xl font-semibold text-indigo-900">Start Learning</h2>
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
          <h2 className="text-xl font-semibold text-indigo-900">Recent Activity</h2>
          {recent.length === 0 ? (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="py-10 flex flex-col items-center justify-center text-center text-indigo-400 text-sm">
                <Clock className="w-8 h-8 mb-2 text-indigo-200" />
                No sessions yet. Start practicing!
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white gap-0 border-slate-100 shadow-sm divide-y divide-slate-100">
              {recent.map(({ session: s, contentTitle }) => {
                const mod = moduleConfig[s.module || 'write'];
                const Icon = mod?.icon ?? PenTool;
                return (
                  <Link key={s.id} href={`/${s.module || 'write'}/${s.contentId}`}>
                    <div className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 hover:translate-x-0.5 transition-all duration-200 cursor-pointer group">
                      <div
                        className={`w-8 h-8 rounded-lg ${mod?.color ?? 'bg-indigo-500'} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-900 truncate">{contentTitle}</p>
                        <p className="text-xs text-indigo-400">
                          <span>{mod?.label ?? 'Write'}</span>
                          <span className="mx-1">&middot;</span>
                          <span>{timeAgo(s.endTime ?? s.startTime)}</span>
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
