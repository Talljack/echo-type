import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

let mockContents: ContentItem[] = [];
let mockRecords: LearningRecord[] = [];
let mockSessions: TypingSession[] = [];

vi.mock('@/lib/db', () => {
  const createWhereChain = (items: () => any[], field: string) => ({
    equals: (value: string | number) => ({
      toArray: async () => items().filter((item) => item[field] === value),
      first: async () => items().find((item) => item[field] === value),
    }),
  });

  return {
    db: {
      contents: {
        toArray: async () => mockContents,
        where: (field: string) => createWhereChain(() => mockContents, field),
      },
      records: {
        toArray: async () => mockRecords,
        where: (field: string) => createWhereChain(() => mockRecords, field),
        put: async (record: LearningRecord) => {
          const index = mockRecords.findIndex((item) => item.id === record.id);
          if (index >= 0) {
            mockRecords[index] = record;
          } else {
            mockRecords.push(record);
          }
        },
      },
      sessions: {
        toArray: async () => mockSessions,
        add: async (session: TypingSession) => {
          mockSessions.push(session);
        },
      },
    },
  };
});

const { savePracticeSession, syncPlanTasks } = await import('@/lib/daily-plan-progress');

function makeContent(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'content-1',
    title: 'Hello',
    text: 'hello world',
    type: 'word',
    category: 'cet4',
    tags: [],
    source: 'imported',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: 'record-1',
    contentId: 'content-1',
    module: 'write',
    attempts: 1,
    correctCount: 1,
    accuracy: 80,
    wpm: 30,
    lastPracticed: Date.now(),
    nextReview: Date.now() + 86400000,
    mistakes: [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<TypingSession> = {}): TypingSession {
  return {
    id: 'session-1',
    contentId: 'content-1',
    module: 'write',
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    totalChars: 11,
    correctChars: 11,
    wrongChars: 0,
    totalWords: 2,
    wpm: 40,
    accuracy: 100,
    completed: true,
    ...overrides,
  };
}

describe('daily-plan-progress', () => {
  beforeEach(() => {
    mockContents = [];
    mockRecords = [];
    mockSessions = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('syncPlanTasks', () => {
    it('marks book-based tasks complete from same-day activity', () => {
      mockContents = [makeContent({ id: 'word-1', category: 'cet4' })];
      mockRecords = [
        makeRecord({
          contentId: 'word-1',
          module: 'write',
          lastPracticed: new Date('2026-03-12T09:00:00+08:00').getTime(),
        }),
      ];

      const tasks = [
        {
          id: 'task-1',
          type: 'new-words' as const,
          title: 'Learn 20 new words',
          description: 'From CET-4',
          module: 'write' as const,
          bookId: 'cet4',
          completed: false,
          skipped: false,
        },
      ];

      const synced = syncPlanTasks(tasks, {
        contents: mockContents,
        records: mockRecords,
        sessions: mockSessions,
        dayKey: '2026-03-12',
      });

      expect(synced[0].completed).toBe(true);
    });

    it('does not complete tasks from activity on a different day', () => {
      mockContents = [makeContent({ id: 'article-1', type: 'article', category: undefined })];
      mockSessions = [
        makeSession({
          contentId: 'article-1',
          module: 'read',
          endTime: new Date('2026-03-11T21:00:00+08:00').getTime(),
        }),
      ];

      const tasks = [
        {
          id: 'task-1',
          type: 'article' as const,
          title: 'Practice an article',
          description: 'Article',
          module: 'read' as const,
          contentId: 'article-1',
          completed: false,
          skipped: false,
        },
      ];

      const synced = syncPlanTasks(tasks, {
        contents: mockContents,
        records: mockRecords,
        sessions: mockSessions,
        dayKey: '2026-03-12',
      });

      expect(synced[0].completed).toBe(false);
    });
  });

  describe('savePracticeSession', () => {
    it('creates a session and matching learning record', async () => {
      const content = makeContent({ id: 'read-1', type: 'article', category: 'book-1' });
      mockContents = [content];

      await savePracticeSession(
        makeSession({
          id: 'session-read-1',
          contentId: 'read-1',
          module: 'read',
          accuracy: 88,
          correctChars: 8,
          wrongChars: 2,
        }),
      );

      expect(mockSessions).toHaveLength(1);
      expect(mockRecords).toHaveLength(1);
      expect(mockRecords[0].module).toBe('read');
      expect(mockRecords[0].attempts).toBe(1);
      expect(mockRecords[0].nextReview).toBeGreaterThan(mockRecords[0].lastPracticed);
    });

    it('treats listen completion as full-credit exposure for review scheduling', async () => {
      await savePracticeSession(
        makeSession({
          id: 'session-listen-1',
          module: 'listen',
          accuracy: 0,
          correctChars: 0,
          wrongChars: 0,
          totalWords: 5,
        }),
      );

      expect(mockRecords[0].module).toBe('listen');
      expect(mockRecords[0].accuracy).toBe(100);
      expect(mockRecords[0].correctCount).toBe(5);
    });

    it('increments attempts when saving repeat practice for the same module', async () => {
      mockRecords = [makeRecord({ id: 'record-repeat', contentId: 'content-1', module: 'write', attempts: 2 })];

      await savePracticeSession(makeSession({ contentId: 'content-1', module: 'write' }));

      expect(mockRecords).toHaveLength(1);
      expect(mockRecords[0].attempts).toBe(3);
    });
  });
});
