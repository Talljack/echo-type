import type { WordBook } from '@/types/wordbook';
import { vocabularyBooks } from './vocabulary';
import { scenarioBooks } from './scenarios';

export const ALL_WORDBOOKS: WordBook[] = [...vocabularyBooks, ...scenarioBooks];

export const ALL_WORDBOOK_IDS = ALL_WORDBOOKS.map((b) => b.id);

export function getWordBook(id: string): WordBook | undefined {
  return ALL_WORDBOOKS.find((b) => b.id === id);
}
