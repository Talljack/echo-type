import type { WordBook, WordItem } from '@/types/wordbook';
import { scenarioBooks } from './scenarios';
import { vocabularyBooks } from './vocabulary';

function findBook(id: string): WordBook | undefined {
  return [...vocabularyBooks, ...scenarioBooks].find((b) => b.id === id);
}

/**
 * Load word items for a word book.
 * All items are shipped inline on the WordBook object.
 */
export async function loadWordBookItems(bookId: string): Promise<WordItem[]> {
  const book = findBook(bookId);
  return book?.items ?? [];
}
