import { getWordBookItemCount, type WordBook } from '@/types/wordbook';

export function getPracticeVocabularyBooks(books: WordBook[]): WordBook[] {
  return books.filter((book) => book.kind === 'vocabulary');
}

export function getPracticeBookItemCount(book: WordBook): number {
  return getWordBookItemCount(book);
}
