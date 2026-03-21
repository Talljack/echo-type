import { describe, expect, it } from 'vitest';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

import {
  fromSupabaseContent,
  fromSupabaseRecord,
  fromSupabaseSession,
  toSupabaseContent,
  toSupabaseRecord,
  toSupabaseSession,
} from '@/lib/sync/mapper';

// ─── Test fixtures ──────────────────────────────────────────────────────────────

const TEST_USER_ID = 'user-abc-123';

const sampleContent: ContentItem = {
  id: 'content-1',
  title: 'Test Article',
  text: 'This is a test article for sync testing.',
  type: 'article',
  category: 'technology',
  tags: ['test', 'sync'],
  source: 'imported',
  difficulty: 'intermediate',
  metadata: { sourceUrl: 'https://example.com' },
  createdAt: 1710000000000,
  updatedAt: 1710100000000,
};

const sampleRecord: LearningRecord = {
  id: 'record-1',
  contentId: 'content-1',
  module: 'write',
  attempts: 5,
  correctCount: 4,
  accuracy: 80,
  wpm: 45.5,
  lastPracticed: 1710050000000,
  nextReview: 1710200000000,
  fsrsCard: {
    due: 1710200000000,
    stability: 3.5,
    difficulty: 5.2,
    elapsed_days: 2,
    scheduled_days: 3,
    reps: 5,
    lapses: 1,
    state: 2,
    last_review: 1710050000000,
  },
  mistakes: [
    { position: 5, expected: 'a', actual: 'e', timestamp: 1710050001000 },
  ],
};

const sampleSession: TypingSession = {
  id: 'session-1',
  contentId: 'content-1',
  module: 'write',
  startTime: 1710060000000,
  endTime: 1710060300000,
  totalChars: 200,
  correctChars: 180,
  wrongChars: 20,
  totalWords: 40,
  wpm: 45,
  accuracy: 90,
  completed: true,
};

// ─── Content Mapper Tests ───────────────────────────────────────────────────────

describe('Content mapper', () => {
  it('converts ContentItem to Supabase format with correct field names', () => {
    const result = toSupabaseContent(sampleContent, TEST_USER_ID);

    expect(result.id).toBe(sampleContent.id);
    expect(result.user_id).toBe(TEST_USER_ID);
    expect(result.title).toBe(sampleContent.title);
    expect(result.text).toBe(sampleContent.text);
    expect(result.type).toBe(sampleContent.type);
    expect(result.category).toBe(sampleContent.category);
    expect(result.tags).toEqual(sampleContent.tags);
    expect(result.source).toBe(sampleContent.source);
    expect(result.difficulty).toBe(sampleContent.difficulty);
    expect(result.metadata).toEqual(sampleContent.metadata);
    expect(result.created_at).toBe(new Date(sampleContent.createdAt).toISOString());
    expect(result.updated_at).toBe(new Date(sampleContent.updatedAt).toISOString());
  });

  it('converts Supabase row back to ContentItem', () => {
    const supabaseRow = toSupabaseContent(sampleContent, TEST_USER_ID);
    const restored = fromSupabaseContent(supabaseRow);

    expect(restored.id).toBe(sampleContent.id);
    expect(restored.title).toBe(sampleContent.title);
    expect(restored.text).toBe(sampleContent.text);
    expect(restored.type).toBe(sampleContent.type);
    expect(restored.category).toBe(sampleContent.category);
    expect(restored.tags).toEqual(sampleContent.tags);
    expect(restored.source).toBe(sampleContent.source);
    expect(restored.difficulty).toBe(sampleContent.difficulty);
    expect(restored.createdAt).toBe(sampleContent.createdAt);
    expect(restored.updatedAt).toBe(sampleContent.updatedAt);
  });

  it('round-trip preserves all content fields', () => {
    const supabaseRow = toSupabaseContent(sampleContent, TEST_USER_ID);
    const restored = fromSupabaseContent(supabaseRow);

    // Compare all fields except metadata (deep equality)
    expect(restored.id).toBe(sampleContent.id);
    expect(restored.title).toBe(sampleContent.title);
    expect(restored.text).toBe(sampleContent.text);
    expect(restored.type).toBe(sampleContent.type);
    expect(restored.tags).toEqual(sampleContent.tags);
    expect(restored.createdAt).toBe(sampleContent.createdAt);
    expect(restored.updatedAt).toBe(sampleContent.updatedAt);
  });

  it('handles null/undefined optional fields in content', () => {
    const contentWithoutOptionals: ContentItem = {
      id: 'content-2',
      title: 'Minimal Content',
      text: 'Hello',
      type: 'sentence',
      tags: [],
      source: 'builtin',
      createdAt: 1710000000000,
      updatedAt: 1710000000000,
    };

    const supabaseRow = toSupabaseContent(contentWithoutOptionals, TEST_USER_ID);
    expect(supabaseRow.category).toBeNull();
    expect(supabaseRow.difficulty).toBeNull();
    expect(supabaseRow.metadata).toBeNull();

    const restored = fromSupabaseContent(supabaseRow);
    expect(restored.category).toBeUndefined();
    expect(restored.difficulty).toBeUndefined();
    expect(restored.metadata).toBeUndefined();
  });
});

// ─── Record Mapper Tests ────────────────────────────────────────────────────────

describe('Record mapper', () => {
  it('converts LearningRecord to Supabase format with correct field names', () => {
    const result = toSupabaseRecord(sampleRecord, TEST_USER_ID);

    expect(result.id).toBe(sampleRecord.id);
    expect(result.user_id).toBe(TEST_USER_ID);
    expect(result.content_id).toBe(sampleRecord.contentId);
    expect(result.module).toBe(sampleRecord.module);
    expect(result.attempts).toBe(sampleRecord.attempts);
    expect(result.correct_count).toBe(sampleRecord.correctCount);
    expect(result.accuracy).toBe(sampleRecord.accuracy);
    expect(result.wpm).toBe(sampleRecord.wpm);
    expect(result.last_practiced).toBe(new Date(sampleRecord.lastPracticed).toISOString());
    expect(result.next_review).toBe(new Date(sampleRecord.nextReview!).toISOString());
    expect(result.fsrs_card).toEqual(sampleRecord.fsrsCard);
    expect(result.mistakes).toEqual(sampleRecord.mistakes);
  });

  it('converts Supabase row back to LearningRecord', () => {
    const supabaseRow = toSupabaseRecord(sampleRecord, TEST_USER_ID);
    const restored = fromSupabaseRecord(supabaseRow);

    expect(restored.id).toBe(sampleRecord.id);
    expect(restored.contentId).toBe(sampleRecord.contentId);
    expect(restored.module).toBe(sampleRecord.module);
    expect(restored.attempts).toBe(sampleRecord.attempts);
    expect(restored.correctCount).toBe(sampleRecord.correctCount);
    expect(restored.accuracy).toBe(sampleRecord.accuracy);
    expect(restored.wpm).toBe(sampleRecord.wpm);
    expect(restored.lastPracticed).toBe(sampleRecord.lastPracticed);
    expect(restored.nextReview).toBe(sampleRecord.nextReview);
    expect(restored.fsrsCard).toEqual(sampleRecord.fsrsCard);
    expect(restored.mistakes).toEqual(sampleRecord.mistakes);
  });

  it('handles record without optional fields', () => {
    const minimalRecord: LearningRecord = {
      id: 'record-2',
      contentId: 'content-1',
      module: 'listen',
      attempts: 0,
      correctCount: 0,
      accuracy: 0,
      lastPracticed: 1710000000000,
      mistakes: [],
    };

    const supabaseRow = toSupabaseRecord(minimalRecord, TEST_USER_ID);
    expect(supabaseRow.wpm).toBeNull();
    expect(supabaseRow.next_review).toBeNull();
    expect(supabaseRow.fsrs_card).toBeNull();

    const restored = fromSupabaseRecord(supabaseRow);
    expect(restored.wpm).toBeUndefined();
    expect(restored.nextReview).toBeUndefined();
    expect(restored.fsrsCard).toBeUndefined();
  });
});

// ─── Session Mapper Tests ───────────────────────────────────────────────────────

describe('Session mapper', () => {
  it('converts TypingSession to Supabase format with correct field names', () => {
    const result = toSupabaseSession(sampleSession, TEST_USER_ID);

    expect(result.id).toBe(sampleSession.id);
    expect(result.user_id).toBe(TEST_USER_ID);
    expect(result.content_id).toBe(sampleSession.contentId);
    expect(result.module).toBe(sampleSession.module);
    expect(result.start_time).toBe(new Date(sampleSession.startTime).toISOString());
    expect(result.end_time).toBe(new Date(sampleSession.endTime!).toISOString());
    expect(result.total_chars).toBe(sampleSession.totalChars);
    expect(result.correct_chars).toBe(sampleSession.correctChars);
    expect(result.wrong_chars).toBe(sampleSession.wrongChars);
    expect(result.total_words).toBe(sampleSession.totalWords);
    expect(result.wpm).toBe(sampleSession.wpm);
    expect(result.accuracy).toBe(sampleSession.accuracy);
    expect(result.completed).toBe(sampleSession.completed);
  });

  it('converts Supabase row back to TypingSession', () => {
    const supabaseRow = toSupabaseSession(sampleSession, TEST_USER_ID);
    const restored = fromSupabaseSession(supabaseRow);

    expect(restored.id).toBe(sampleSession.id);
    expect(restored.contentId).toBe(sampleSession.contentId);
    expect(restored.module).toBe(sampleSession.module);
    expect(restored.startTime).toBe(sampleSession.startTime);
    expect(restored.endTime).toBe(sampleSession.endTime);
    expect(restored.totalChars).toBe(sampleSession.totalChars);
    expect(restored.correctChars).toBe(sampleSession.correctChars);
    expect(restored.wrongChars).toBe(sampleSession.wrongChars);
    expect(restored.totalWords).toBe(sampleSession.totalWords);
    expect(restored.wpm).toBe(sampleSession.wpm);
    expect(restored.accuracy).toBe(sampleSession.accuracy);
    expect(restored.completed).toBe(sampleSession.completed);
  });

  it('handles session without endTime', () => {
    const incompleteSession: TypingSession = {
      ...sampleSession,
      id: 'session-2',
      endTime: undefined,
      completed: false,
    };

    const supabaseRow = toSupabaseSession(incompleteSession, TEST_USER_ID);
    expect(supabaseRow.end_time).toBeNull();

    const restored = fromSupabaseSession(supabaseRow);
    expect(restored.endTime).toBeUndefined();
    expect(restored.completed).toBe(false);
  });
});

// ─── Cross-cutting concerns ─────────────────────────────────────────────────────

describe('Mapper edge cases', () => {
  it('preserves empty arrays for tags and mistakes', () => {
    const content: ContentItem = {
      ...sampleContent,
      tags: [],
    };
    const supabaseRow = toSupabaseContent(content, TEST_USER_ID);
    const restored = fromSupabaseContent(supabaseRow);
    expect(restored.tags).toEqual([]);
  });

  it('handles zero numeric values correctly', () => {
    const record: LearningRecord = {
      id: 'record-zero',
      contentId: 'content-1',
      module: 'read',
      attempts: 0,
      correctCount: 0,
      accuracy: 0,
      lastPracticed: 1710000000000,
      mistakes: [],
    };

    const supabaseRow = toSupabaseRecord(record, TEST_USER_ID);
    const restored = fromSupabaseRecord(supabaseRow);
    expect(restored.attempts).toBe(0);
    expect(restored.correctCount).toBe(0);
    expect(restored.accuracy).toBe(0);
  });

  it('preserves all four module types through round-trip', () => {
    const modules = ['listen', 'speak', 'read', 'write'] as const;

    for (const mod of modules) {
      const record: LearningRecord = {
        ...sampleRecord,
        id: `record-${mod}`,
        module: mod,
      };
      const supabaseRow = toSupabaseRecord(record, TEST_USER_ID);
      const restored = fromSupabaseRecord(supabaseRow);
      expect(restored.module).toBe(mod);
    }
  });
});
