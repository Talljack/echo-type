'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, Mic, PenTool, Library, TrendingUp, Target } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalContent: number;
  totalSessions: number;
  avgAccuracy: number;
  avgWpm: number;
  contentByType: Record<string, number>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalContent: 0,
    totalSessions: 0,
    avgAccuracy: 0,
    avgWpm: 0,
    contentByType: {},
  });

  useEffect(() => {
    async function loadStats() {
      const contents = await db.contents.toArray();
      const sessions = await db.sessions.toArray();

      const contentByType: Record<string, number> = {};
      contents.forEach((c) => {
        contentByType[c.type] = (contentByType[c.type] || 0) + 1;
      });

      const completedSessions = sessions.filter((s) => s.completed);
      const avgAccuracy =
        completedSessions.length > 0
          ? completedSessions.reduce((sum, s) => sum + s.accuracy, 0) / completedSessions.length
          : 0;
      const avgWpm =
        completedSessions.length > 0
          ? completedSessions.reduce((sum, s) => sum + s.wpm, 0) / completedSessions.length
          : 0;

      setStats({
        totalContent: contents.length,
        totalSessions: sessions.length,
        avgAccuracy: Math.round(avgAccuracy),
        avgWpm: Math.round(avgWpm),
        contentByType,
      });
    }
    loadStats();
  }, []);

  const modules = [
    { href: '/listen', label: 'Listen', icon: Headphones, desc: 'Listen to English content with TTS', color: 'bg-blue-500' },
    { href: '/speak', label: 'Speak / Read', icon: Mic, desc: 'Read aloud with speech recognition', color: 'bg-green-500' },
    { href: '/write', label: 'Write', icon: PenTool, desc: 'Typing practice with error correction', color: 'bg-purple-500' },
    { href: '/library', label: 'Library', icon: Library, desc: 'Manage and import content', color: 'bg-amber-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-[var(--font-poppins)] text-indigo-900">
          Welcome to EchoType
        </h1>
        <p className="text-indigo-600 mt-1">Master English through listening, speaking, reading & writing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Total Content</CardTitle>
            <Library className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{stats.totalContent}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Sessions</CardTitle>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Avg Accuracy</CardTitle>
            <Target className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{stats.avgAccuracy}%</div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600">Avg WPM</CardTitle>
            <PenTool className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{stats.avgWpm}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold font-[var(--font-poppins)] text-indigo-900 mb-4">
          Start Learning
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <Card className="bg-white/70 backdrop-blur-xl border-indigo-100 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center`}>
                    <mod.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                      {mod.label}
                    </h3>
                    <p className="text-sm text-indigo-500">{mod.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
