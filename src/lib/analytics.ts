import { db } from '@/lib/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgoTs(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

function fillDateRange(startTs: number, days: number): string[] {
  const dates: string[] = [];
  const d = new Date(startTs);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    dates.push(dateKey(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

export async function getActivityHeatmapData(days = 365): Promise<{ date: string; count: number }[]> {
  const cutoff = daysAgoTs(days);
  const sessions = await db.sessions.where('startTime').aboveOrEqual(cutoff).toArray();
  const completed = sessions.filter((s) => s.completed);

  const counts = new Map<string, number>();
  for (const s of completed) {
    const key = dateKey(s.startTime);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const allDates = fillDateRange(cutoff, days);
  return allDates.map((date) => ({ date, count: counts.get(date) || 0 }));
}

// ─── Accuracy Trend ───────────────────────────────────────────────────────────

export async function getAccuracyTrend(
  module?: string,
  days = 30,
): Promise<{ date: string; accuracy: number; module?: string }[]> {
  const cutoff = daysAgoTs(days);
  const sessions = await db.sessions.where('startTime').aboveOrEqual(cutoff).toArray();
  const completed = sessions.filter((s) => s.completed && (!module || s.module === module));

  const grouped = new Map<string, number[]>();
  for (const s of completed) {
    const key = dateKey(s.startTime);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s.accuracy);
  }

  const allDates = fillDateRange(cutoff, days);
  const result: { date: string; accuracy: number; module?: string }[] = [];
  let lastAccuracy = 0;
  for (const date of allDates) {
    const vals = grouped.get(date);
    if (vals && vals.length > 0) {
      lastAccuracy = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    result.push({ date, accuracy: vals ? lastAccuracy : 0, ...(module ? { module } : {}) });
  }
  return result;
}

// ─── WPM Trend ────────────────────────────────────────────────────────────────

export async function getWpmTrend(days = 30): Promise<{ date: string; wpm: number }[]> {
  const cutoff = daysAgoTs(days);
  const sessions = await db.sessions.where('startTime').aboveOrEqual(cutoff).toArray();
  const writes = sessions.filter((s) => s.completed && s.module === 'write');

  const grouped = new Map<string, number[]>();
  for (const s of writes) {
    const key = dateKey(s.startTime);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s.wpm);
  }

  const allDates = fillDateRange(cutoff, days);
  return allDates.map((date) => {
    const vals = grouped.get(date);
    return {
      date,
      wpm: vals ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });
}

// ─── Daily Session Counts ─────────────────────────────────────────────────────

export async function getDailySessionCounts(
  days = 30,
): Promise<{ date: string; listen: number; speak: number; read: number; write: number }[]> {
  const cutoff = daysAgoTs(days);
  const sessions = await db.sessions.where('startTime').aboveOrEqual(cutoff).toArray();
  const completed = sessions.filter((s) => s.completed);

  const grouped = new Map<string, { listen: number; speak: number; read: number; write: number }>();
  for (const s of completed) {
    const key = dateKey(s.startTime);
    if (!grouped.has(key)) grouped.set(key, { listen: 0, speak: 0, read: 0, write: 0 });
    const mod = (s.module || 'write') as 'listen' | 'speak' | 'read' | 'write';
    grouped.get(key)![mod]++;
  }

  const allDates = fillDateRange(cutoff, days);
  return allDates.map((date) => ({
    date,
    ...(grouped.get(date) || { listen: 0, speak: 0, read: 0, write: 0 }),
  }));
}

// ─── Vocabulary Growth ────────────────────────────────────────────────────────

export async function getVocabularyGrowth(): Promise<{ date: string; total: number }[]> {
  const records = await db.records.toArray();
  if (records.length === 0) return [];

  // Sort by lastPracticed
  const sorted = [...records].sort((a, b) => a.lastPracticed - b.lastPracticed);

  const seen = new Set<string>();
  const byDate = new Map<string, number>();

  for (const r of sorted) {
    seen.add(r.contentId);
    const key = dateKey(r.lastPracticed);
    byDate.set(key, seen.size);
  }

  // Fill in dates from first to today
  const firstDate = sorted[0].lastPracticed;
  const now = Date.now();
  const totalDays = Math.ceil((now - firstDate) / 86_400_000) + 1;
  const allDates = fillDateRange(firstDate, Math.min(totalDays, 365));

  let lastTotal = 0;
  return allDates.map((date) => {
    if (byDate.has(date)) lastTotal = byDate.get(date)!;
    return { date, total: lastTotal };
  });
}

// ─── Module Breakdown ─────────────────────────────────────────────────────────

export async function getModuleBreakdown(): Promise<{ module: string; sessions: number; time: number }[]> {
  const sessions = await db.sessions.toArray();
  const completed = sessions.filter((s) => s.completed);

  const breakdown = new Map<string, { sessions: number; time: number }>();
  for (const s of completed) {
    const mod = s.module || 'write';
    if (!breakdown.has(mod)) breakdown.set(mod, { sessions: 0, time: 0 });
    const entry = breakdown.get(mod)!;
    entry.sessions++;
    if (s.endTime && s.startTime) {
      entry.time += s.endTime - s.startTime;
    }
  }

  return Array.from(breakdown.entries()).map(([module, data]) => ({
    module,
    sessions: data.sessions,
    time: data.time,
  }));
}

// ─── Streak Data ──────────────────────────────────────────────────────────────

export async function getStreakData(): Promise<{ current: number; longest: number; dates: string[] }> {
  const sessions = await db.sessions.toArray();
  const completed = sessions.filter((s) => s.completed);

  const practiceDates = new Set<string>();
  for (const s of completed) {
    practiceDates.add(dateKey(s.startTime));
  }

  const sortedDates = [...practiceDates].sort();
  if (sortedDates.length === 0) return { current: 0, longest: 0, dates: [] };

  // Calculate streaks
  let current = 0;
  let longest = 0;
  let streak = 1;

  const today = dateKey(Date.now());
  const yesterday = dateKey(Date.now() - 86_400_000);

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);

    if (diffDays === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  // Current streak: count backwards from today/yesterday
  const lastDate = sortedDates[sortedDates.length - 1];
  if (lastDate === today || lastDate === yesterday) {
    current = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const prev = new Date(sortedDates[i]);
      const curr = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest, dates: sortedDates };
}

// ─── Review Forecast ──────────────────────────────────────────────────────────

export async function getReviewForecast(days = 7): Promise<{ date: string; count: number }[]> {
  const records = await db.records.toArray();
  const now = Date.now();
  const endTs = now + days * 86_400_000;

  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.nextReview && r.nextReview >= now && r.nextReview <= endTs) {
      const key = dateKey(r.nextReview);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const allDates = fillDateRange(now, days);
  return allDates.map((date) => ({ date, count: counts.get(date) || 0 }));
}
