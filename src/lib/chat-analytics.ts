import { db } from '@/lib/db';

export interface LearningSnapshot {
  overview: {
    totalContent: number;
    totalSessions: number;
    totalWords: number;
    avgAccuracy: number;
    avgWpm: number;
    streak: number;
  };
  moduleBreakdown: {
    module: string;
    sessions: number;
    avgAccuracy: number;
    lastPracticed: number | null;
  }[];
  recentProgress: {
    last7Days: { sessions: number; words: number; avgAccuracy: number };
    last30Days: { sessions: number; words: number; avgAccuracy: number };
  };
  weaknesses: {
    lowAccuracyContent: { contentId: string; title: string; accuracy: number; module: string }[];
    neglectedModules: string[];
  };
  cefrLevel: string | null;
}

/**
 * Collect a compact learning snapshot from IndexedDB for AI analysis.
 * Reuses query patterns from dashboard and daily-plan.
 */
export async function collectLearningSnapshot(): Promise<LearningSnapshot> {
  const [contents, sessions, records] = await Promise.all([
    db.contents.toArray(),
    db.sessions.toArray(),
    db.records.toArray(),
  ]);

  const completed = sessions.filter((s) => s.completed);

  // ─── Overview ───────────────────────────────────────────────────────────
  const totalWords = completed.reduce((sum, s) => sum + (s.totalWords || 0), 0);
  const scored = completed.filter((s) => (s.module || 'write') !== 'listen');
  const avgAccuracy =
    scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + s.accuracy, 0) / scored.length) : 0;
  const writes = completed.filter((s) => (s.module || 'write') === 'write');
  const avgWpm = writes.length > 0 ? Math.round(writes.reduce((sum, s) => sum + s.wpm, 0) / writes.length) : 0;

  // Streak from localStorage
  let streak = 0;
  try {
    const planData = localStorage.getItem('echotype_daily_plan');
    if (planData) {
      const parsed = JSON.parse(planData);
      streak = parsed.streak || 0;
    }
  } catch {
    /* ignore */
  }

  // ─── Module Breakdown ─────────────────────────────────────────────────
  const modules = ['listen', 'speak', 'read', 'write'];
  const moduleBreakdown = modules.map((mod) => {
    const modSessions = completed.filter((s) => (s.module || 'write') === mod);
    const modScored = modSessions.filter(() => mod !== 'listen');
    const modAccuracy =
      modScored.length > 0 ? Math.round(modScored.reduce((sum, s) => sum + s.accuracy, 0) / modScored.length) : 0;
    const lastPracticed = modSessions.length > 0 ? Math.max(...modSessions.map((s) => s.endTime ?? s.startTime)) : null;
    return { module: mod, sessions: modSessions.length, avgAccuracy: modAccuracy, lastPracticed };
  });

  // ─── Recent Progress ──────────────────────────────────────────────────
  const now = Date.now();
  const day7Ago = now - 7 * 24 * 60 * 60 * 1000;
  const day30Ago = now - 30 * 24 * 60 * 60 * 1000;

  function periodStats(since: number) {
    const periodSessions = completed.filter((s) => (s.endTime ?? s.startTime) >= since);
    const periodWords = periodSessions.reduce((sum, s) => sum + (s.totalWords || 0), 0);
    const periodScored = periodSessions.filter((s) => (s.module || 'write') !== 'listen');
    const periodAccuracy =
      periodScored.length > 0
        ? Math.round(periodScored.reduce((sum, s) => sum + s.accuracy, 0) / periodScored.length)
        : 0;
    return { sessions: periodSessions.length, words: periodWords, avgAccuracy: periodAccuracy };
  }

  // ─── Weaknesses ───────────────────────────────────────────────────────
  const contentMap = new Map(contents.map((c) => [c.id, c.title]));
  const lowAccuracyContent = records
    .filter((r) => r.accuracy < 70 && r.attempts >= 1)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map((r) => ({
      contentId: r.contentId,
      title: contentMap.get(r.contentId) || 'Unknown',
      accuracy: Math.round(r.accuracy),
      module: r.module,
    }));

  const neglectedModules = moduleBreakdown
    .filter((m) => m.sessions === 0 || (m.lastPracticed && m.lastPracticed < day7Ago))
    .map((m) => m.module);

  // ─── CEFR Level ───────────────────────────────────────────────────────
  let cefrLevel: string | null = null;
  try {
    const assessmentData = localStorage.getItem('echotype_assessment');
    if (assessmentData) {
      const parsed = JSON.parse(assessmentData);
      cefrLevel = parsed.state?.currentLevel || null;
    }
  } catch {
    /* ignore */
  }

  return {
    overview: {
      totalContent: contents.length,
      totalSessions: completed.length,
      totalWords,
      avgAccuracy,
      avgWpm,
      streak,
    },
    moduleBreakdown,
    recentProgress: {
      last7Days: periodStats(day7Ago),
      last30Days: periodStats(day30Ago),
    },
    weaknesses: { lowAccuracyContent, neglectedModules },
    cefrLevel,
  };
}
