import type { ContentItem } from './content';

export type WordItem = Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>;

export interface WordBook {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  kind: 'vocabulary' | 'scenario';
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  filterTag: string;
  tags: string[];
  /**
   * Total number of items for display.
   * Large books set this explicitly; small books derive it from items.length.
   */
  itemCount?: number;
  /**
   * Inline items – only populated for small books (scenarios, curated lists).
   * Large vocabulary books load items lazily via loadWordBookItems().
   */
  items?: WordItem[];
}

/** Get the display count for a word book (prefers itemCount, falls back to items.length). */
export function getWordBookItemCount(book: WordBook): number {
  return book.itemCount ?? book.items?.length ?? 0;
}
