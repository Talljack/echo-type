import type { WordBook } from '@/types/wordbook';
import { scenarioBooks } from './scenarios';
import { vocabularyBooks } from './vocabulary';

export const ALL_WORDBOOKS: WordBook[] = [...vocabularyBooks, ...scenarioBooks];

export const ALL_WORDBOOK_IDS = ALL_WORDBOOKS.map((b) => b.id);

export function getWordBook(id: string): WordBook | undefined {
  return ALL_WORDBOOKS.find((b) => b.id === id);
}

export { loadWordBookItems } from './load-items';
