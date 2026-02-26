import { create } from 'zustand';
import { db } from '@/lib/db';
import type { ContentItem, ContentType, Difficulty } from '@/types/content';

interface ContentStore {
  items: ContentItem[];
  loading: boolean;
  filter: {
    type?: ContentType;
    difficulty?: Difficulty;
    search: string;
  };
  setFilter: (filter: Partial<ContentStore['filter']>) => void;
  loadContents: () => Promise<void>;
  addContent: (item: ContentItem) => Promise<void>;
  addBulkContent: (items: ContentItem[]) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  getFilteredItems: () => ContentItem[];
}

export const useContentStore = create<ContentStore>((set, get) => ({
  items: [],
  loading: false,
  filter: { search: '' },

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  loadContents: async () => {
    set({ loading: true });
    const items = await db.contents.orderBy('createdAt').reverse().toArray();
    set({ items, loading: false });
  },

  addContent: async (item) => {
    await db.contents.add(item);
    const items = await db.contents.orderBy('createdAt').reverse().toArray();
    set({ items });
  },

  addBulkContent: async (items) => {
    await db.contents.bulkAdd(items);
    const allItems = await db.contents.orderBy('createdAt').reverse().toArray();
    set({ items: allItems });
  },

  deleteContent: async (id) => {
    await db.contents.delete(id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  getFilteredItems: () => {
    const { items, filter } = get();
    return items.filter((item) => {
      if (filter.type && item.type !== filter.type) return false;
      if (filter.difficulty && item.difficulty !== filter.difficulty) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.text.toLowerCase().includes(q)
        );
      }
      return true;
    });
  },
}));
