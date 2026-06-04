import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { db } from '@/lib/db';
import { ALL_WORDBOOK_IDS, getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import type { ContentItem } from '@/types/content';

interface WordBookStore {
  importedIds: Set<string>;
  loading: boolean;
  isLoaded: boolean;
  loadImportedState: (force?: boolean) => Promise<void>;
  importWordBook: (wordbookId: string) => Promise<void>;
  removeWordBook: (wordbookId: string) => Promise<void>;
  isImported: (wordbookId: string) => boolean;
}

let loadImportedStatePromise: Promise<void> | null = null;

export const useWordBookStore = create<WordBookStore>((set, get) => ({
  importedIds: new Set(),
  loading: false,
  isLoaded: false,

  loadImportedState: async (force?: boolean) => {
    if (loadImportedStatePromise) {
      if (!force) return loadImportedStatePromise;
      await loadImportedStatePromise;
    }

    if (!force && get().isLoaded) return;

    set({ loading: true });
    loadImportedStatePromise = Promise.all(
      ALL_WORDBOOK_IDS.map(async (id) => {
        const count = await db.contents.where('category').equals(id).count();
        return count > 0 ? id : null;
      }),
    )
      .then((counts) => {
        set({ importedIds: new Set(counts.filter(Boolean) as string[]), loading: false, isLoaded: true });
      })
      .finally(() => {
        loadImportedStatePromise = null;
      });

    return loadImportedStatePromise;
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
    set((state) => ({ importedIds: new Set([...state.importedIds, wordbookId]), isLoaded: true }));
  },

  removeWordBook: async (wordbookId: string) => {
    await db.contents.where('category').equals(wordbookId).delete();
    set((state) => {
      const next = new Set(state.importedIds);
      next.delete(wordbookId);
      return { importedIds: next, isLoaded: true };
    });
  },

  isImported: (wordbookId: string) => {
    return get().importedIds.has(wordbookId);
  },
}));
