import { describe, expect, it } from 'vitest';
import { getPracticeBookItemCount, getPracticeVocabularyBooks } from './wordbook-practice-library';
import type { WordBook } from '@/types/wordbook';

const books: WordBook[] = [
  { id: 'vocabulary', name: '词书', nameEn: 'Vocabulary', emoji: '📘', description: '', filterTag: 'General', difficulty: 'beginner', kind: 'vocabulary', tags: [], itemCount: 20 },
  { id: 'scenario', name: '场景', nameEn: 'Scenario', emoji: '💬', description: '', filterTag: 'Social', difficulty: 'beginner', kind: 'scenario', tags: [], itemCount: 10 },
];

describe('wordbook practice library', () => {
  it('keeps every built-in vocabulary book discoverable by practice modules', () => {
    expect(getPracticeVocabularyBooks(books)).toEqual([books[0]]);
  });

  it('shows the book catalogue count rather than a misleading zero when items load on demand', () => {
    expect(getPracticeBookItemCount(books[0]!)).toBe(20);
  });
});
