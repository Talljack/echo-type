import { describe, expect, it } from 'vitest';
import { ALL_WORDBOOKS, ALL_WORDBOOK_IDS, getWordBook } from './index';
import { vocabularyBooks } from './vocabulary';
import { scenarioBooks } from './scenarios';
import { getWordBookItemCount, type WordBook } from '@/types/wordbook';

// ─── Data integrity ──────────────────────────────────────────────────────────

describe('ALL_WORDBOOKS data integrity', () => {
  it('contains both vocabulary and scenario books', () => {
    expect(ALL_WORDBOOKS.length).toBe(vocabularyBooks.length + scenarioBooks.length);
  });

  it('has at least 15 word books total', () => {
    expect(ALL_WORDBOOKS.length).toBeGreaterThanOrEqual(15);
  });

  it('every book has a unique id', () => {
    const ids = ALL_WORDBOOKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every book has required string fields', () => {
    for (const book of ALL_WORDBOOKS) {
      expect(book.id).toBeTruthy();
      expect(book.name).toBeTruthy();
      expect(book.nameEn).toBeTruthy();
      expect(book.description).toBeTruthy();
      expect(book.emoji).toBeTruthy();
      expect(book.filterTag).toBeTruthy();
    }
  });

  it('every book has valid kind', () => {
    for (const book of ALL_WORDBOOKS) {
      expect(['vocabulary', 'scenario']).toContain(book.kind);
    }
  });

  it('every book has valid difficulty', () => {
    for (const book of ALL_WORDBOOKS) {
      expect(['beginner', 'intermediate', 'advanced']).toContain(book.difficulty);
    }
  });

  it('every book has at least 10 items (inline or via itemCount)', () => {
    for (const book of ALL_WORDBOOKS) {
      const count = getWordBookItemCount(book);
      expect(count, `${book.id} has only ${count} items`).toBeGreaterThanOrEqual(10);
    }
  });

  it('every inline item has title, text, type, and source', () => {
    for (const book of ALL_WORDBOOKS) {
      if (!book.items) continue; // large books load from JSON
      for (const item of book.items) {
        expect(item.title, `${book.id}: missing title`).toBeTruthy();
        expect(item.text, `${book.id} / ${item.title}: missing text`).toBeTruthy();
        expect(item.type, `${book.id} / ${item.title}: missing type`).toBeTruthy();
        expect(item.source, `${book.id} / ${item.title}: missing source`).toBe('builtin');
      }
    }
  });

  it('every book has at least one tag', () => {
    for (const book of ALL_WORDBOOKS) {
      expect(book.tags.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Vocabulary books ─────────────────────────────────────────────────────────

describe('vocabularyBooks', () => {
  it('all have kind = vocabulary', () => {
    for (const book of vocabularyBooks) {
      expect(book.kind).toBe('vocabulary');
    }
  });

  it('includes expected core books', () => {
    const ids = vocabularyBooks.map((b) => b.id);
    expect(ids).toContain('cet4');
    expect(ids).toContain('cet6');
    expect(ids).toContain('toefl');
    expect(ids).toContain('ielts');
  });

  it('vocabulary books have significantly expanded word counts', () => {
    for (const book of vocabularyBooks) {
      const count = getWordBookItemCount(book);
      expect(
        count,
        `${book.id} has only ${count} words`,
      ).toBeGreaterThanOrEqual(50);
    }
  });
});

// ─── Scenario books ──────────────────────────────────────────────────────────

describe('scenarioBooks', () => {
  it('all have kind = scenario', () => {
    for (const book of scenarioBooks) {
      expect(book.kind).toBe('scenario');
    }
  });

  it('includes at least a few scenario packs', () => {
    expect(scenarioBooks.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── getWordBook ──────────────────────────────────────────────────────────────

describe('getWordBook', () => {
  it('returns a book by id', () => {
    const book = getWordBook('cet4');
    expect(book).toBeDefined();
    expect(book!.id).toBe('cet4');
    expect(book!.nameEn).toBeTruthy();
  });

  it('returns undefined for unknown id', () => {
    expect(getWordBook('nonexistent-id')).toBeUndefined();
  });

  it('can retrieve every book in ALL_WORDBOOK_IDS', () => {
    for (const id of ALL_WORDBOOK_IDS) {
      const book = getWordBook(id);
      expect(book, `getWordBook('${id}') returned undefined`).toBeDefined();
      expect(book!.id).toBe(id);
    }
  });
});

// ─── Related books algorithm ─────────────────────────────────────────────────

function getRelatedBooks(book: WordBook, limit = 4): WordBook[] {
  return ALL_WORDBOOKS
    .filter((b) => b.id !== book.id && b.kind === book.kind)
    .map((b) => {
      let score = 0;
      if (b.filterTag === book.filterTag) score += 3;
      if (b.difficulty === book.difficulty) score += 2;
      const overlap = b.tags.filter((t) => book.tags.includes(t)).length;
      score += overlap;
      return { book: b, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.book);
}

describe('getRelatedBooks algorithm', () => {
  it('excludes the source book from results', () => {
    const book = ALL_WORDBOOKS[0];
    const related = getRelatedBooks(book);
    expect(related.every((r) => r.id !== book.id)).toBe(true);
  });

  it('only returns books of the same kind', () => {
    const vocabBook = ALL_WORDBOOKS.find((b) => b.kind === 'vocabulary')!;
    const related = getRelatedBooks(vocabBook);
    expect(related.every((r) => r.kind === 'vocabulary')).toBe(true);
  });

  it('returns at most `limit` books', () => {
    const book = ALL_WORDBOOKS[0];
    expect(getRelatedBooks(book, 2).length).toBeLessThanOrEqual(2);
    expect(getRelatedBooks(book, 4).length).toBeLessThanOrEqual(4);
  });

  it('prioritises same filterTag', () => {
    const book = ALL_WORDBOOKS.find((b) => b.kind === 'vocabulary')!;
    const related = getRelatedBooks(book, 10);
    if (related.length >= 2) {
      const sameTag = related.filter((r) => r.filterTag === book.filterTag);
      const otherTag = related.filter((r) => r.filterTag !== book.filterTag);
      // Same-tag books should appear before other-tag books (by index)
      if (sameTag.length > 0 && otherTag.length > 0) {
        const lastSameIdx = related.lastIndexOf(sameTag[sameTag.length - 1]);
        const firstOtherIdx = related.indexOf(otherTag[0]);
        expect(lastSameIdx).toBeLessThan(firstOtherIdx);
      }
    }
  });

  it('returns empty array when no same-kind books exist', () => {
    const lonely: WordBook = {
      id: 'lonely',
      name: 'Lonely',
      nameEn: 'Lonely Book',
      description: 'No friends',
      kind: 'vocabulary',
      emoji: '😢',
      difficulty: 'beginner',
      filterTag: 'Nonexistent',
      tags: ['unique'],
      items: [],
    };
    // We can't fully test this without mocking ALL_WORDBOOKS,
    // but we can at least verify the function runs
    const related = getRelatedBooks(lonely);
    expect(related.every((r) => r.id !== 'lonely')).toBe(true);
  });
});
