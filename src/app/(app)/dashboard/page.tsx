'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Headphones, Mic, PenTool, Library, TrendingUp, Target, FileText,
  Hash, BookMarked, Upload, Clock, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
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
  speak:  { label: 'Speak',  icon: Mic,        color: 'bg-green-500',  href: '/speak'  },
  write:  { label: 'Write',  icon: PenTool,    color: 'bg-purple-500', href: '/write'  },
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
    totalContent: 0, totalSessions: 0, totalWords: 0,
    articlesPracticed: 0, avgAccuracy: 0, avgWpm: 0, sessionsByModule: {},
  });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const isNewUser = stats.totalContent === 0;

  useEffect(() => {
    async function load() {
      const [contents, sessions] = await Promise.all([
        db.contents.toArray(),
        db.sessions.toArray(),
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
      const avgAccuracy = scored.length > 0
        ? scored.reduce((sum, s) => sum + s.accuracy, 0) / scored.length : 0;
      const writes = completed.filter((s) => (s.module || 'write') === 'write');
      const avgWpm = writes.length > 0
        ? writes.reduce((sum, s) => sum + s.wpm, 0) / writes.length : 0;

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
    { label: 'Content', value: stats.totalContent, icon: Library },
    { label: 'Sessions', value: stats.totalSessions, icon: TrendingUp },
    { label: 'Words', value: stats.totalWords.toLocaleString(), icon: Hash },
    { label: 'Articles', value: stats.articlesPracticed, icon: FileText },
    { label: 'Accuracy', value: `${stats.avgAccuracy}%`, icon: Target },
    { label: 'Avg WPM', value: stats.avgWpm, icon: PenTool },
  ];

  const modules = [
    { href: '/listen', key: 'listen', label: 'Listen', icon: Headphones, desc: 'Listen with TTS', color: 'bg-indigo-500' },
    { href: '/speak',  key: 'speak',  label: 'Speak',  icon: Mic,        desc: 'Read aloud, get feedback', color: 'bg-green-500' },
    { href: '/write',  key: 'write',  label: 'Write',  icon: PenTool,    desc: 'Typing practice', color: 'bg-purple-500' },
    { href: '/library',key: 'library',label: 'Library',icon: Library,    desc: 'Manage content', color: 'bg-amber-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">Welcome to EchoType</h1>
        <p className="text-indigo-600 mt-1">Master English through listening, speaking, reading & writing</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-indigo-600">{label}</CardTitle>
              <Icon className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New-user onboarding */}
      {isNewUser && (
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
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
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer">
                  <Upload className="w-4 h-4 mr-1.5" /> Import
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Start Learning */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold font-[var(--font-poppins)] text-indigo-900">Start Learning</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <Link key={mod.href} href={mod.href}>
                <Card className="bg-white border-slate-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className={`w-11 h-11 rounded-xl ${mod.color} flex items-center justify-center shrink-0`}>
                      <mod.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">{mod.label}</h3>
                      <p className="text-xs text-indigo-500">{mod.desc}</p>
                    </div>
                    {mod.key !== 'library' && stats.sessionsByModule[mod.key] ? (
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-indigo-900">{stats.sessionsByModule[mod.key]}</div>
                        <div className="text-xs text-indigo-400">sessions</div>
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-indigo-300 shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-[var(--font-poppins)] text-indigo-900">Recent Activity</h2>
          {recent.length === 0 ? (
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="py-10 text-center text-indigo-400 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 text-indigo-200" />
                No sessions yet. Start practicing!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recent.map(({ session: s, contentTitle }) => {
                const mod = moduleConfig[s.module || 'write'];
                const Icon = mod?.icon ?? PenTool;
                return (
                  <Link key={s.id} href={`/${s.module || 'write'}/${s.contentId}`}>
                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className={`w-8 h-8 rounded-lg ${mod?.color ?? 'bg-indigo-500'} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-indigo-900 truncate">{contentTitle}</p>
                          <p className="text-xs text-indigo-400">{timeAgo(s.endTime ?? s.startTime)}</p>
                        </div>
                        {s.accuracy > 0 && (
                          <span className={`text-xs font-semibold shrink-0 ${
                            s.accuracy >= 90 ? 'text-green-600' : s.accuracy >= 70 ? 'text-amber-600' : 'text-red-500'
                          }`}>
                            {s.accuracy}%
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
