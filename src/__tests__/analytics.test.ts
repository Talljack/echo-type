import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningRecord, TypingSession } from '@/types/content';

// ─── Mock Data ────────────────────────────────────────────────────────────────

let mockSessions: TypingSession[] = [];
let mockRecords: LearningRecord[] = [];

vi.mock('@/lib/db', () => {
  return {
    db: {
      sessions: {
        toArray: async () => mockSessions,
        where: (field: string) => ({
          aboveOrEqual: (value: number) => ({
            toArray: async () => mockSessions.filter((s) => (s as any)[field] >= value),
          }),
        }),
      },
      records: {
        toArray: async () => mockRecords,
      },
    },
  };
});

// Import after mock
const {
  getActivityHeatmapData,
  getAccuracyTrend,
  getWpmTrend,
  getDailySessionCounts,
  getVocabularyGrowth,
  getModuleBreakdown,
  getStreakData,
  getReviewForecast,
} = await import('@/lib/analytics');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<TypingSession> = {}): TypingSession {
  return {
    id: Math.random().toString(36),
    contentId: 'c1',
    module: 'write',
    startTime: Date.now(),
    endTime: Date.now() + 300_000,
    totalChars: 100,
    correctChars: 90,
    wrongChars: 10,
    totalWords: 20,
    wpm: 45,
    accuracy: 90,
    completed: true,
    ...overrides,
  };
}

function daysAgo(n: number): number {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSessions = [];
  mockRecords = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getActivityHeatmapData', () => {
  it('returns empty counts when no sessions exist', async () => {
    const result = await getActivityHeatmapData(7);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.count === 0)).toBe(true);
  });

  it('counts completed sessions per day', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(1) }),
      makeSession({ startTime: daysAgo(1) }),
      makeSession({ startTime: daysAgo(1), completed: false }), // should be excluded
      makeSession({ startTime: daysAgo(3) }),
    ];
    const result = await getActivityHeatmapData(7);
    const day1 = result.find((d) => {
      const target = new Date(daysAgo(1));
      return d.date === `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    });
    expect(day1?.count).toBe(2);
  });
});

describe('getAccuracyTrend', () => {
  it('returns accuracy averages per day', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(1), accuracy: 80 }),
      makeSession({ startTime: daysAgo(1), accuracy: 90 }),
    ];
    const result = await getAccuracyTrend(undefined, 7);
    const day1 = result.find((d) => {
      const target = new Date(daysAgo(1));
      return d.date === `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    });
    expect(day1?.accuracy).toBe(85);
  });

  it('filters by module', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(1), accuracy: 80, module: 'write' }),
      makeSession({ startTime: daysAgo(1), accuracy: 60, module: 'listen' }),
    ];
    const result = await getAccuracyTrend('write', 7);
    const day1 = result.find((d) => {
      const target = new Date(daysAgo(1));
      return d.date === `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    });
    expect(day1?.accuracy).toBe(80);
  });
});

describe('getWpmTrend', () => {
  it('only includes write module sessions', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(1), wpm: 50, module: 'write' }),
      makeSession({ startTime: daysAgo(1), wpm: 30, module: 'listen' }),
    ];
    const result = await getWpmTrend(7);
    const day1 = result.find((d) => {
      const target = new Date(daysAgo(1));
      return d.date === `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    });
    expect(day1?.wpm).toBe(50);
  });
});

describe('getDailySessionCounts', () => {
  it('breaks down sessions by module', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(1), module: 'write' }),
      makeSession({ startTime: daysAgo(1), module: 'write' }),
      makeSession({ startTime: daysAgo(1), module: 'listen' }),
    ];
    const result = await getDailySessionCounts(7);
    const day1 = result.find((d) => {
      const target = new Date(daysAgo(1));
      return d.date === `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    });
    expect(day1?.write).toBe(2);
    expect(day1?.listen).toBe(1);
    expect(day1?.speak).toBe(0);
  });
});

describe('getModuleBreakdown', () => {
  it('aggregates sessions and time per module', async () => {
    const start = daysAgo(1);
    mockSessions = [
      makeSession({ module: 'write', startTime: start, endTime: start + 600_000 }),
      makeSession({ module: 'write', startTime: start, endTime: start + 300_000 }),
      makeSession({ module: 'listen', startTime: start, endTime: start + 120_000 }),
    ];
    const result = await getModuleBreakdown();
    const write = result.find((r) => r.module === 'write');
    expect(write?.sessions).toBe(2);
    expect(write?.time).toBe(900_000);
    const listen = result.find((r) => r.module === 'listen');
    expect(listen?.sessions).toBe(1);
  });
});

describe('getStreakData', () => {
  it('returns zero streak when no sessions', async () => {
    const result = await getStreakData();
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it('calculates consecutive day streaks', async () => {
    mockSessions = [
      makeSession({ startTime: daysAgo(0) }),
      makeSession({ startTime: daysAgo(1) }),
      makeSession({ startTime: daysAgo(2) }),
      // gap
      makeSession({ startTime: daysAgo(5) }),
      makeSession({ startTime: daysAgo(6) }),
    ];
    const result = await getStreakData();
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });
});

describe('getVocabularyGrowth', () => {
  it('returns empty array when no records', async () => {
    const result = await getVocabularyGrowth();
    expect(result).toEqual([]);
  });

  it('tracks cumulative unique content items', async () => {
    mockRecords = [
      { id: 'r1', contentId: 'c1', module: 'write', attempts: 1, correctCount: 1, accuracy: 90, lastPracticed: daysAgo(3), mistakes: [] },
      { id: 'r2', contentId: 'c2', module: 'write', attempts: 1, correctCount: 1, accuracy: 85, lastPracticed: daysAgo(2), mistakes: [] },
      { id: 'r3', contentId: 'c1', module: 'read', attempts: 1, correctCount: 1, accuracy: 80, lastPracticed: daysAgo(1), mistakes: [] },
    ];
    const result = await getVocabularyGrowth();
    // After day -3: 1 item, after day -2: 2 items, after day -1: still 2 (c1 seen again)
    const last = result[result.length - 1];
    expect(last.total).toBe(2);
  });
});

describe('getReviewForecast', () => {
  it('counts items due for review in each upcoming day', async () => {
    const tomorrow = Date.now() + 86_400_000;
    const dayAfter = Date.now() + 2 * 86_400_000;
    mockRecords = [
      { id: 'r1', contentId: 'c1', module: 'write', attempts: 1, correctCount: 1, accuracy: 90, lastPracticed: daysAgo(1), nextReview: tomorrow, mistakes: [] },
      { id: 'r2', contentId: 'c2', module: 'write', attempts: 1, correctCount: 1, accuracy: 85, lastPracticed: daysAgo(1), nextReview: tomorrow, mistakes: [] },
      { id: 'r3', contentId: 'c3', module: 'write', attempts: 1, correctCount: 1, accuracy: 80, lastPracticed: daysAgo(1), nextReview: dayAfter, mistakes: [] },
    ];
    const result = await getReviewForecast(7);
    expect(result).toHaveLength(7);
    const total = result.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(3);
  });
});
