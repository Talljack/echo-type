import type { WordItem } from '@/types/wordbook';
import { getWordBook } from './index';

interface RawWordEntry {
  word: string;
  sentence: string;
}

/**
 * Load word items for a word book.
 * - For React Native, uses require() to load JSON files from data directory.
 * - Falls back to inline items on the WordBook object (small / curated books).
 */
export async function loadWordBookItems(bookId: string): Promise<WordItem[]> {
  const book = getWordBook(bookId);

  // Scenario / curated books already ship with inline items
  if (book?.items?.length) {
    return book.items;
  }

  // Try loading from JSON file using require()
  try {
    // In React Native, we use require() for JSON files
    // The actual JSON files will be placed in the data directory
    const data: RawWordEntry[] = require(`./data/${bookId}.json`);
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
  } catch {
    // JSON not available, fall through to inline items
  }

  // Fallback: inline items on the book object
  return book?.items ?? [];
}
