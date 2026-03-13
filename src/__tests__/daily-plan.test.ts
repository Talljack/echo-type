import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock ALL_WORDBOOKS
vi.mock('@/lib/wordbooks', () => ({
  ALL_WORDBOOKS: [
    {
      id: 'cet4',
      name: 'CET-4',
      nameEn: 'CET-4 Vocabulary',
      kind: 'vocabulary',
      emoji: '',
      difficulty: 'intermediate',
      filterTag: 'cet4',
      tags: [],
      description: '',
    },
    {
      id: 'travel-en',
      name: 'Travel',
      nameEn: 'Travel Scenarios',
      kind: 'scenario',
      emoji: '',
      difficulty: 'beginner',
      filterTag: 'travel',
      tags: [],
      description: '',
    },
    {
      id: 'ielts',
      name: 'IELTS',
      nameEn: 'IELTS Vocabulary',
      kind: 'vocabulary',
      emoji: '',
      difficulty: 'advanced',
      filterTag: 'ielts',
      tags: [],
      description: '',
    },
    {
      id: 'business-en',
      name: 'Business',
      nameEn: 'Business Scenarios',
      kind: 'scenario',
      emoji: '',
      difficulty: 'intermediate',
      filterTag: 'business',
      tags: [],
      description: '',
    },
    {
      id: 'boardroom-en',
      name: 'Boardroom',
      nameEn: 'Boardroom Scenarios',
      kind: 'scenario',
      emoji: '',
      difficulty: 'advanced',
      filterTag: 'boardroom',
      tags: [],
      description: '',
    },
  ],
}));

// Track mock state for Dexie queries
let mockContents: ContentItem[] = [];
let mockRecords: LearningRecord[] = [];
let mockSessions: TypingSession[] = [];

// Mock Dexie database
vi.mock('@/lib/db', () => {
  // biome-ignore lint: test helper uses any for generic Dexie mock
  const createWhereChain = (items: () => any[], field: string) => ({
    // biome-ignore lint: test helper
    equals: (val: any) => ({
      count: async () => items().filter((i) => i[field] === val).length,
      toArray: async () => items().filter((i) => i[field] === val),
      first: async () => items().find((i) => i[field] === val) ?? undefined,
    }),
    // biome-ignore lint: test helper
    belowOrEqual: (val: any) => ({
      sortBy: async (sortField: string) => {
        const filtered = items().filter((i) => {
          const v = i[field];
          return typeof v === 'number' && v <= val;
        });
        // biome-ignore lint: test helper
        return filtered.sort((a: any, b: any) => ((a[sortField] ?? 0) - (b[sortField] ?? 0)));
      },
    }),
  });

  return {
    db: {
      records: {
        where: (field: string) => createWhereChain(() => mockRecords, field),
        count: async () => mockRecords.length,
        toArray: async () => mockRecords,
      },
      contents: {
        where: (field: string) => createWhereChain(() => mockContents, field),
        bulkGet: async (ids: string[]) => ids.map((id) => mockContents.find((item) => item.id === id)),
        count: async () => mockContents.length,
        toArray: async () => mockContents,
      },
      sessions: {
        where: (field: string) => createWhereChain(() => mockSessions, field),
        count: async () => mockSessions.length,
        toArray: async () => mockSessions,
      },
    },
  };
});

// Import AFTER mocks are set up
const { generateDailyPlan, getDailyPlanSignature } = await import('@/lib/daily-plan');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultGoal = { wordsPerDay: 20, sessionsPerDay: 3 };
const DAY = 24 * 60 * 60 * 1000;

function makeContent(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: `content-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Content',
    text: 'Hello world',
    type: 'word',
    tags: [],
    source: 'imported',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: `record-${Math.random().toString(36).slice(2, 8)}`,
    contentId: 'content-1',
    module: 'write',
    attempts: 1,
    correctCount: 1,
    accuracy: 80,
    lastPracticed: Date.now() - 86400000,
    nextReview: Date.now() - 3600000, // due 1h ago
    mistakes: [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<TypingSession> = {}): TypingSession {
  return {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    contentId: 'content-1',
    module: 'write',
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    totalChars: 100,
    correctChars: 90,
    wrongChars: 10,
    totalWords: 20,
    wpm: 40,
    accuracy: 90,
    completed: true,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('generateDailyPlan', () => {
  beforeEach(() => {
    mockContents = [];
    mockRecords = [];
    mockSessions = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Empty state ───────────────────────────────────────────────────────────

  describe('empty state (new user)', () => {
    it('returns empty array when no data', async () => {
      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks).toEqual([]);
    });

    it('builds a signature from current content availability', async () => {
      mockContents = [
        makeContent({ category: 'cet4', updatedAt: 100 }),
        makeContent({ category: 'travel-en', updatedAt: 200 }),
      ];
      mockRecords = [makeRecord()];
      mockSessions = [makeSession()];

      await expect(getDailyPlanSignature()).resolves.toBe('2:2:200');
    });
  });

  // ── Review separation ─────────────────────────────────────────────────────

  describe('review separation', () => {
    it('keeps the daily plan focused on forward-learning tasks even when reviews are due', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'w2', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 's1', category: 'travel-en' }),
      ];
      mockRecords = [
        makeRecord({ contentId: 'w1', nextReview: Date.now() - 1000, accuracy: 42, module: 'write' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.find((t) => t.type === 'review')).toBeUndefined();
      expect(tasks).toHaveLength(3);
      expect(tasks.every((task) => ['new-words', 'article', 'speak', 'listen'].includes(task.type))).toBe(true);
    });
  });

  // ── New words tasks ───────────────────────────────────────────────────────

  describe('new words tasks', () => {
    it('creates new-words task from imported vocabulary wordbook', async () => {
      // Simulate a wordbook with imported content
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'w2', category: 'cet4', type: 'word' }),
        makeContent({ id: 'w3', category: 'cet4', type: 'word' }),
      ];
      // No records = all are unpracticed

      const tasks = await generateDailyPlan(defaultGoal);
      const newWordsTask = tasks.find((t) => t.type === 'new-words');
      expect(newWordsTask).toBeDefined();
      expect(newWordsTask!.title).toContain('3'); // 3 unpracticed
      expect(newWordsTask!.description).toContain('CET-4');
      expect(newWordsTask!.bookId).toBe('cet4');
      expect(newWordsTask!.module).toBe('write');
    });

    it('respects wordsPerDay limit for new words count', async () => {
      // 50 words available, but goal is 10 per day
      mockContents = Array.from({ length: 50 }, (_, i) =>
        makeContent({ id: `w${i}`, category: 'cet4', type: 'word' }),
      );

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 3 });
      const newWordsTask = tasks.find((t) => t.type === 'new-words');
      expect(newWordsTask).toBeDefined();
      expect(newWordsTask!.title).toContain('10');
    });

    it('skips wordbook where all words are already practiced', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
      ];
      mockRecords = [
        makeRecord({ contentId: 'w1', nextReview: Date.now() + 86400000 }), // not due
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.find((t) => t.type === 'new-words')).toBeUndefined();
    });

    it('skips wordbook with no imported content', async () => {
      // cet4 has 0 imported contents
      mockContents = [];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.find((t) => t.type === 'new-words')).toBeUndefined();
    });

    it('prefers vocabulary difficulty close to the assessment level', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word', difficulty: 'intermediate' }),
        makeContent({ id: 'w2', category: 'ielts', type: 'word', difficulty: 'advanced' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal, { currentLevel: 'C1' });
      const newWordsTask = tasks.find((task) => task.type === 'new-words');
      expect(newWordsTask?.bookId).toBe('ielts');
    });
  });

  // ── Article tasks ─────────────────────────────────────────────────────────

  describe('article tasks', () => {
    it('creates article task when articles exist', async () => {
      mockContents = [
        makeContent({ id: 'a1', type: 'article', title: 'My Morning' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      const articleTask = tasks.find((t) => t.type === 'article');
      expect(articleTask).toBeDefined();
      expect(articleTask!.description).toBe('My Morning');
      expect(articleTask!.module).toBe('read');
      expect(articleTask!.contentId).toBe('a1');
    });

    it('picks the least practiced article', async () => {
      mockContents = [
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 'a2', type: 'article', title: 'Article B' }),
      ];
      // a1 has 5 sessions, a2 has 1 session
      mockSessions = [
        ...Array.from({ length: 5 }, () => makeSession({ contentId: 'a1' })),
        makeSession({ contentId: 'a2' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      const articleTask = tasks.find((t) => t.type === 'article');
      expect(articleTask).toBeDefined();
      expect(articleTask!.contentId).toBe('a2'); // least practiced
    });

    it('does not create article task when no articles exist', async () => {
      mockContents = [
        makeContent({ id: 'w1', type: 'word' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.find((t) => t.type === 'article')).toBeUndefined();
    });

    it('prefers article difficulty close to the assessment level', async () => {
      mockContents = [
        makeContent({ id: 'a1', type: 'article', title: 'Beginner Article', difficulty: 'beginner' }),
        makeContent({ id: 'a2', type: 'article', title: 'Intermediate Article', difficulty: 'intermediate' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal, { currentLevel: 'B2' });
      const articleTask = tasks.find((task) => task.type === 'article');
      expect(articleTask?.contentId).toBe('a2');
    });

    it('rotates comparable article recommendations across days', async () => {
      vi.useFakeTimers();
      mockContents = [
        makeContent({ id: 'a1', type: 'article', title: 'Article A', difficulty: 'intermediate' }),
        makeContent({ id: 'a2', type: 'article', title: 'Article B', difficulty: 'intermediate' }),
      ];

      vi.setSystemTime(new Date('2026-03-13T08:00:00+08:00'));
      const firstDayTasks = await generateDailyPlan({ wordsPerDay: 20, sessionsPerDay: 1 }, { currentLevel: 'B2' });

      vi.setSystemTime(new Date('2026-03-14T08:00:00+08:00'));
      const secondDayTasks = await generateDailyPlan({ wordsPerDay: 20, sessionsPerDay: 1 }, { currentLevel: 'B2' });

      expect(firstDayTasks.find((task) => task.type === 'article')?.contentId).not.toBe(
        secondDayTasks.find((task) => task.type === 'article')?.contentId,
      );
    });
  });

  // ── Speak tasks ───────────────────────────────────────────────────────────

  describe('speak tasks', () => {
    it('creates speak task when scenarios are imported', async () => {
      mockContents = [
        makeContent({ id: 's1', category: 'travel-en' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      const speakTask = tasks.find((t) => t.type === 'speak');
      expect(speakTask).toBeDefined();
      expect(speakTask!.module).toBe('speak');
      expect(speakTask!.bookId).toBe('travel-en');
      expect(speakTask!.description).toContain('Travel');
    });

    it('does not create speak task when no scenarios imported', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4' }), // vocabulary, not scenario
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.find((t) => t.type === 'speak')).toBeUndefined();
    });

    it('prefers the least practiced imported scenario book', async () => {
      mockContents = [
        makeContent({ id: 'travel-1', category: 'travel-en' }),
        makeContent({ id: 'travel-2', category: 'travel-en' }),
        makeContent({ id: 'biz-1', category: 'business-en' }),
      ];
      mockSessions = [
        makeSession({ contentId: 'travel-1', module: 'speak' }),
        makeSession({ contentId: 'travel-2', module: 'speak' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      const speakTask = tasks.find((task) => task.type === 'speak');
      expect(speakTask?.bookId).toBe('business-en');
    });

    it('prefers scenario difficulty close to the assessment level', async () => {
      mockContents = [
        makeContent({ id: 'travel-1', category: 'travel-en' }),
        makeContent({ id: 'boardroom-1', category: 'boardroom-en' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal, { currentLevel: 'C2' });
      const speakTask = tasks.find((task) => task.type === 'speak');
      expect(speakTask?.bookId).toBe('boardroom-en');
    });
  });

  // ── Listen tasks ──────────────────────────────────────────────────────────

  describe('listen tasks', () => {
    it('creates a listen task when sessionsPerDay allows four skill tasks', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Listen Article' }),
        makeContent({ id: 's1', category: 'travel-en' }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 4 });
      expect(tasks.map((task) => task.type)).toContain('listen');
      expect(tasks.find((task) => task.type === 'listen')?.module).toBe('listen');
    });
  });

  // ── Task cap ──────────────────────────────────────────────────────────────

  describe('task limit', () => {
    it('caps total tasks at 5', async () => {
      // Set up data that would generate many tasks
      mockRecords = Array.from({ length: 5 }, (_, i) =>
        makeRecord({ contentId: `r${i}`, nextReview: Date.now() - 1000 }),
      );
      mockContents = [
        ...Array.from({ length: 30 }, (_, i) =>
          makeContent({ id: `w${i}`, category: 'cet4', type: 'word' }),
        ),
        makeContent({ id: 'a1', type: 'article', title: 'Art 1' }),
        makeContent({ id: 'a2', type: 'article', title: 'Art 2' }),
        makeContent({ id: 's1', category: 'travel-en' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      expect(tasks.length).toBeLessThanOrEqual(5);
    });

    it('uses sessionsPerDay as the task cap', async () => {
      mockContents = [
        ...Array.from({ length: 20 }, (_, i) => makeContent({ id: `w${i}`, category: 'cet4', type: 'word' })),
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 'travel-1', category: 'travel-en' }),
        makeContent({ id: 'listen-1', type: 'sentence', title: 'Listen A' }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 2 });
      expect(tasks).toHaveLength(2);
      expect(tasks.every((task) => task.type !== 'review')).toBe(true);
    });

    it('tilts toward weaker and less-practiced modules under a tight cap', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 's1', category: 'travel-en' }),
      ];
      mockRecords = [
        makeRecord({ contentId: 'w1', module: 'write', accuracy: 96, lastPracticed: Date.now() - DAY }),
        makeRecord({ contentId: 'a1', module: 'read', accuracy: 94, lastPracticed: Date.now() - DAY }),
      ];
      mockSessions = [
        makeSession({ contentId: 'w1', module: 'write', endTime: Date.now() - DAY }),
        makeSession({ contentId: 'a1', module: 'read', endTime: Date.now() - DAY }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 3 });
      expect(tasks.map((task) => task.type)).toContain('listen');
    });

    it('maximizes module coverage across forward-learning tasks under a tight cap', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 's1', category: 'travel-en' }),
        makeContent({ id: 'listen-1', type: 'sentence', title: 'Listen A' }),
      ];
      mockRecords = [
        makeRecord({
          contentId: 'w1',
          module: 'write',
          accuracy: 35,
          lastPracticed: Date.now() - DAY,
          nextReview: Date.now() - 1000,
        }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 3 });
      expect(tasks).toHaveLength(3);
      expect(new Set(tasks.map((task) => task.module)).size).toBeGreaterThanOrEqual(3);
      expect(tasks.every((task) => task.type !== 'review')).toBe(true);
      expect(tasks.some((task) => task.module === 'read')).toBe(true);
      expect(tasks.some((task) => task.module === 'speak' || task.module === 'listen')).toBe(true);
    });

    it('prioritizes a module missing from the last 7 days over already-covered weekly modules', async () => {
      const recentTime = Date.now() - 2 * DAY;
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Article A' }),
        makeContent({ id: 's1', category: 'travel-en' }),
        makeContent({ id: 'listen-1', type: 'sentence', title: 'Listen A' }),
      ];
      mockRecords = [
        makeRecord({ contentId: 'w1', module: 'write', accuracy: 72, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
        makeRecord({ contentId: 'a1', module: 'read', accuracy: 70, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
        makeRecord({ contentId: 's1', module: 'speak', accuracy: 68, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
      ];
      mockSessions = [
        makeSession({ contentId: 'w1', module: 'write', endTime: recentTime }),
        makeSession({ contentId: 'a1', module: 'read', endTime: recentTime }),
        makeSession({ contentId: 's1', module: 'speak', endTime: recentTime }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 3 });
      expect(tasks).toHaveLength(3);
      expect(tasks.some((task) => task.module === 'listen')).toBe(true);
    });

    it('does not let a severely mismatched weekly-missing module override better-fitting content', async () => {
      const recentTime = Date.now() - 2 * DAY;
      mockContents = [
        makeContent({ id: 'w-advanced', category: 'ielts', type: 'word', difficulty: 'advanced' }),
        makeContent({ id: 'a-advanced', type: 'article', title: 'Advanced Article', difficulty: 'advanced' }),
        makeContent({ id: 'listen-basic', type: 'sentence', title: 'Basic Listening', difficulty: 'beginner' }),
      ];
      mockRecords = [
        makeRecord({ contentId: 'w-advanced', module: 'write', accuracy: 76, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
        makeRecord({ contentId: 'a-advanced', module: 'read', accuracy: 42, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
        makeRecord({ contentId: 's-weekly', module: 'speak', accuracy: 72, lastPracticed: recentTime, nextReview: Date.now() + DAY }),
      ];
      mockSessions = [
        makeSession({ contentId: 'w-advanced', module: 'write', endTime: recentTime }),
        makeSession({ contentId: 'a-advanced', module: 'read', endTime: recentTime }),
        makeSession({ contentId: 's-weekly', module: 'speak', endTime: recentTime }),
      ];

      const tasks = await generateDailyPlan({ wordsPerDay: 10, sessionsPerDay: 1 }, { currentLevel: 'C2' });
      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.module).toBe('read');
      expect(tasks[0]?.type).toBe('article');
    });
  });

  // ── Task structure ────────────────────────────────────────────────────────

  describe('task structure', () => {
    it('all tasks have required fields with correct types', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Test Article' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      for (const task of tasks) {
        expect(task.id).toEqual(expect.any(String));
        expect(task.id.length).toBeGreaterThan(0);
        expect(['new-words', 'article', 'speak', 'listen']).toContain(task.type);
        expect(task.title).toEqual(expect.any(String));
        expect(task.description).toEqual(expect.any(String));
        expect(['listen', 'speak', 'read', 'write']).toContain(task.module);
        expect(task.completed).toBe(false);
        expect(task.skipped).toBe(false);
      }
    });
  });

  // ── Priority ordering ─────────────────────────────────────────────────────

  describe('priority ordering', () => {
    it('new-words come before article tasks', async () => {
      mockContents = [
        makeContent({ id: 'w1', category: 'cet4', type: 'word' }),
        makeContent({ id: 'a1', type: 'article', title: 'Test' }),
      ];

      const tasks = await generateDailyPlan(defaultGoal);
      const newIdx = tasks.findIndex((t) => t.type === 'new-words');
      const artIdx = tasks.findIndex((t) => t.type === 'article');
      if (newIdx >= 0 && artIdx >= 0) {
        expect(newIdx).toBeLessThan(artIdx);
      }
    });
  });
});
