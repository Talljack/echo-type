import type { WordItem } from '@/types/wordbook';
import { getWordBook } from './index';

interface RawWordEntry {
  word: string;
  sentence: string;
}

/**
 * Load word items for a word book.
 * - Tries public/wordbooks/{bookId}.json first (large vocabulary books).
 * - Falls back to inline items on the WordBook object (small / curated books).
 */
export async function loadWordBookItems(bookId: string): Promise<WordItem[]> {
  const book = getWordBook(bookId);

  // Scenario / curated books already ship with inline items, so avoid
  // hitting a missing JSON file and polluting the console with 404s.
  if (book?.items?.length) {
    return book.items;
  }

  // Try loading from JSON file first
  try {
    const res = await fetch(`/wordbooks/${bookId}.json`);
    if (res.ok) {
      const data: RawWordEntry[] = await res.json();
      const difficulty = book?.difficulty ?? 'intermediate';
      return data.map((entry) => ({
        title: entry.word,
        text: entry.sentence || entry.word,
        type: 'word' as const,
        category: bookId,
        tags: [bookId],
        source: 'builtin' as const,
        difficulty,
      }));
    }
  } catch {
    // JSON not available, fall through to inline items
  }

  // Fallback: inline items on the book object
  return book?.items ?? [];
}
