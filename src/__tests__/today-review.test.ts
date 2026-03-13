import { describe, expect, it } from 'vitest';
import { buildTodayReviewItems } from '@/lib/today-review';
import type { ContentItem, LearningRecord } from '@/types/content';

function makeContent(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'content-1',
    title: 'Sample Content',
    text: 'Hello world',
    type: 'article',
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
    module: 'read',
    attempts: 2,
    correctCount: 10,
    accuracy: 60,
    lastPracticed: Date.now() - 86400000,
    nextReview: Date.now() - 1000,
    mistakes: [],
    ...overrides,
  };
}

describe('buildTodayReviewItems', () => {
  it('returns due items sorted by lower accuracy first', () => {
    const now = Date.now();
    const contents = [
      makeContent({ id: 'a1', title: 'Article A', type: 'article' }),
      makeContent({ id: 'a2', title: 'Article B', type: 'article' }),
    ];
    const records = [
      makeRecord({ id: 'r1', contentId: 'a1', accuracy: 82, nextReview: now - 2000 }),
      makeRecord({ id: 'r2', contentId: 'a2', accuracy: 55, nextReview: now - 1000 }),
    ];

    const items = buildTodayReviewItems(records, contents, now);
    expect(items.map((item) => item.contentId)).toEqual(['a2', 'a1']);
  });

  it('builds review hrefs for queue items', () => {
    const now = Date.now();
    const items = buildTodayReviewItems(
      [
        makeRecord({ id: 'r1', contentId: 'write-1', module: 'write' }),
        makeRecord({ id: 'r2', contentId: 'speak-1', module: 'speak' }),
      ],
      [
        makeContent({ id: 'write-1', title: 'Word', type: 'word', category: 'cet4' }),
        makeContent({ id: 'speak-1', title: 'Coffee Shop', type: 'sentence', category: 'coffee-shop' }),
      ],
      now,
    );

    expect(items.find((item) => item.module === 'write')?.href).toBe('/write/write-1');
    expect(items.find((item) => item.module === 'speak')?.href).toBe('/speak/book/coffee-shop');
  });

  it('ignores records whose content no longer exists or is not due', () => {
    const now = Date.now();
    const items = buildTodayReviewItems(
      [
        makeRecord({ id: 'r1', contentId: 'missing', nextReview: now - 1000 }),
        makeRecord({ id: 'r2', contentId: 'existing', nextReview: now + 1000 }),
      ],
      [makeContent({ id: 'existing' })],
      now,
    );

    expect(items).toEqual([]);
  });
});
