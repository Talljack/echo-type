import { describe, expect, it } from 'vitest';
import {
  resolveWordBookPracticeItems,
  type WordBookPracticeProgressSnapshot,
} from '@/lib/wordbook-practice-progress';

interface TestItem {
  id: string;
}

function makeItems(count: number): TestItem[] {
  return Array.from({ length: count }, (_, index) => ({ id: `word-${index + 1}` }));
}

describe('wordbook-practice-progress', () => {
  it('excludes already practiced items when building a limited daily-plan set', () => {
    const items = makeItems(6);
    const practicedIds = new Set(['word-1', 'word-2', 'word-3']);

    const resolved = resolveWordBookPracticeItems({
      availableItems: items,
      limit: 2,
      savedProgress: null,
      practicedIds,
      dayKey: '2026-06-16',
    });

    expect(resolved.items.map((item) => item.id).sort()).toEqual(['word-4', 'word-5']);
    expect(resolved.restoredCompletedItemIds).toEqual([]);
  });

  it('restores the same frozen item set for the same day', () => {
    const items = makeItems(6);
    const savedProgress: WordBookPracticeProgressSnapshot = {
      currentIndex: 1,
      completedCount: 1,
      completedItemIds: ['word-5'],
      itemIds: ['word-5', 'word-6'],
      dayKey: '2026-06-16',
      finished: false,
      updatedAt: Date.now(),
    };

    const resolved = resolveWordBookPracticeItems({
      availableItems: items,
      limit: 2,
      savedProgress,
      practicedIds: new Set(['word-1', 'word-2', 'word-3', 'word-4']),
      dayKey: '2026-06-16',
    });

    expect(resolved.items.map((item) => item.id)).toEqual(['word-5', 'word-6']);
    expect(resolved.restoredCompletedItemIds).toEqual(['word-5']);
  });

  it('builds a fresh limited set on a new day instead of reusing yesterday item ids', () => {
    const items = makeItems(6);
    const savedProgress: WordBookPracticeProgressSnapshot = {
      currentIndex: 1,
      completedCount: 2,
      completedItemIds: ['word-1', 'word-2'],
      itemIds: ['word-1', 'word-2'],
      dayKey: '2026-06-15',
      finished: true,
      updatedAt: Date.now(),
    };

    const resolved = resolveWordBookPracticeItems({
      availableItems: items,
      limit: 2,
      savedProgress,
      practicedIds: new Set(['word-1', 'word-2', 'word-3']),
      dayKey: '2026-06-16',
    });

    expect(resolved.items.map((item) => item.id).sort()).toEqual(['word-4', 'word-5']);
    expect(resolved.restoredCompletedItemIds).toEqual([]);
  });
});
