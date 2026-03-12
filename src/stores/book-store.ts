import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { db } from '@/lib/db';
import type { BookItem, ContentItem, Difficulty } from '@/types/content';

interface ImportBookInput {
  title: string;
  author: string;
  description?: string;
  difficulty: Difficulty;
  chapters: { title: string; text: string }[];
  coverEmoji?: string;
  tags?: string[];
  metadata?: { sourceFilename?: string; sourceUrl?: string };
}

interface BookStore {
  books: BookItem[];
  loading: boolean;
  loadBooks: () => Promise<void>;
  getBook: (id: string) => BookItem | undefined;
  importBook: (input: ImportBookInput) => Promise<string>;
  removeBook: (bookId: string) => Promise<void>;
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  loading: false,

  loadBooks: async () => {
    set({ loading: true });
    const books = await db.books.orderBy('createdAt').reverse().toArray();
    set({ books, loading: false });
  },

  getBook: (id: string) => {
    return get().books.find((b) => b.id === id);
  },

  importBook: async (input: ImportBookInput) => {
    const bookId = nanoid();
    const category = `book-${bookId}`;
    const now = Date.now();

    const totalWords = input.chapters.reduce((sum, ch) => sum + ch.text.split(/\s+/).filter(Boolean).length, 0);

    const book: BookItem = {
      id: bookId,
      title: input.title,
      author: input.author,
      description: input.description || `${input.chapters.length} chapters, ${totalWords.toLocaleString()} words`,
      chapterCount: input.chapters.length,
      totalWords,
      difficulty: input.difficulty,
      tags: input.tags || ['book'],
      source: 'imported',
      coverEmoji: input.coverEmoji || '📖',
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const items: ContentItem[] = input.chapters.map((ch, i) => ({
      id: nanoid(),
      title: ch.title || `Chapter ${i + 1}`,
      text: ch.text,
      type: 'article' as const,
      category,
      tags: ['book', bookId],
      source: 'imported' as const,
      difficulty: input.difficulty,
      metadata: input.metadata,
      createdAt: now + i, // ensure ordering
      updatedAt: now + i,
    }));

    await db.books.add(book);
    await db.contents.bulkAdd(items);
    set((state) => ({ books: [book, ...state.books] }));

    return bookId;
  },

  removeBook: async (bookId: string) => {
    const category = `book-${bookId}`;
    await db.contents.where('category').equals(category).delete();
    await db.books.delete(bookId);
    set((state) => ({ books: state.books.filter((b) => b.id !== bookId) }));
  },
}));
