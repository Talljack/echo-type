import { describe, expect, it } from 'vitest';
import { groupLibraryContent } from './library-data';

describe('groupLibraryContent', () => {
  it('keeps standalone words visible and excludes recycled content', () => {
    const groups = groupLibraryContent([
      { id: 'word', type: 'word', title: 'hello', text: 'hello', tags: [], source: 'builtin', createdAt: 1, updatedAt: 1 },
      { id: 'deleted', type: 'sentence', title: 'gone', text: 'gone', tags: [], source: 'imported', createdAt: 1, updatedAt: 1, deletedAt: 2 },
    ]);

    expect(groups.word.map((item) => item.id)).toEqual(['word']);
    expect(groups.sentence).toEqual([]);
  });
});
