import type { WordItem } from '@/types/wordbook';

type WordTuple = [word: string, sentence: string];
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** Convert compact [word, sentence] tuples into full content items for a word book. */
export function makeWords(bookId: string, difficulty: Difficulty, words: WordTuple[]): WordItem[] {
  return words.map(([title, text]) => ({
    title,
    text,
    type: 'word' as const,
    category: bookId,
    tags: [bookId],
    source: 'builtin' as const,
    difficulty,
  }));
}
