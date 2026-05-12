import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { db } from '@/lib/db';
import { ALL_WORDBOOK_IDS, getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import type { ContentItem } from '@/types/content';

interface WordBookStore {
  importedIds: Set<string>;
  loading: boolean;
  loadImportedState: () => Promise<void>;
  importWordBook: (wordbookId: string) => Promise<void>;
  removeWordBook: (wordbookId: string) => Promise<void>;
  isImported: (wordbookId: string) => boolean;
}

export const useWordBookStore = create<WordBookStore>((set, get) => ({
  importedIds: new Set(),
  loading: false,

  loadImportedState: async () => {
    set({ loading: true });
    const counts = await Promise.all(
      ALL_WORDBOOK_IDS.map(async (id) => {
        const count = await db.contents.where('category').equals(id).count();
        return count > 0 ? id : null;
      }),
    );
    set({ importedIds: new Set(counts.filter(Boolean) as string[]), loading: false });
  },

  importWordBook: async (wordbookId: string) => {
    const book = getWordBook(wordbookId);
    if (!book) return;
    const now = Date.now();
    const wordItems = await loadWordBookItems(wordbookId);
    const items: ContentItem[] = wordItems.map((item) => ({
      ...item,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }));
    await db.contents.bulkAdd(items);
    set((state) => ({ importedIds: new Set([...state.importedIds, wordbookId]) }));
  },

  removeWordBook: async (wordbookId: string) => {
    await db.contents.where('category').equals(wordbookId).delete();
    set((state) => {
      const next = new Set(state.importedIds);
      next.delete(wordbookId);
      return { importedIds: next };
    });
  },

  isImported: (wordbookId: string) => {
    return get().importedIds.has(wordbookId);
  },
}));
