import { nanoid } from 'nanoid/non-secure';
import { create } from 'zustand';
import { getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Content } from '@/types/content';

interface WordbookState {
  importedIds: Set<string>;
  loading: boolean;
  loadImportedState: () => Promise<void>;
  importWordbook: (wordbookId: string) => Promise<void>;
  removeWordbook: (wordbookId: string) => Promise<void>;
  isImported: (wordbookId: string) => boolean;
}

function collectImportedIds(contents: Content[]): Set<string> {
  const ids = new Set<string>();
  for (const item of contents) {
    if (item.category) ids.add(item.category);
  }
  return ids;
}

export const useWordbookStore = create<WordbookState>((set, get) => ({
  importedIds: new Set(),
  loading: false,

  loadImportedState: async () => {
    const contents = useLibraryStore.getState().contents;
    set({ importedIds: collectImportedIds(contents), loading: false });
  },

  importWordbook: async (wordbookId: string) => {
    if (get().isImported(wordbookId)) return;

    const book = getWordBook(wordbookId);
    if (!book) return;

    set({ loading: true });

    const now = Date.now();
    const wordItems = await loadWordBookItems(wordbookId);
    const nextItems: Content[] = wordItems.map((item) => ({
      id: nanoid(),
      title: item.title,
      type: item.type as Content['type'],
      content: item.text,
      text: item.text,
      language: 'en',
      difficulty: item.difficulty as Content['difficulty'],
      tags: item.tags,
      source: item.source,
      category: wordbookId,
      createdAt: now,
      updatedAt: now,
      isStarred: false,
      progress: 0,
      wordCount: item.text.trim().split(/\s+/).length,
      metadata: {
        wordbookId,
        wordbookName: book.nameEn,
        wordbookKind: book.kind,
      },
    }));

    useLibraryStore.setState((state) => ({
      contents: [...nextItems, ...state.contents],
    }));

    set((state) => ({
      importedIds: new Set([...state.importedIds, wordbookId]),
      loading: false,
    }));
  },

  removeWordbook: async (wordbookId: string) => {
    set({ loading: true });

    useLibraryStore.setState((state) => ({
      contents: state.contents.filter((item) => item.category !== wordbookId),
    }));

    set((state) => {
      const next = new Set(state.importedIds);
      next.delete(wordbookId);
      return { importedIds: next, loading: false };
    });
  },

  isImported: (wordbookId: string) => get().importedIds.has(wordbookId),
}));
