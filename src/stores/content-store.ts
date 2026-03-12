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
    tags?: string[];
    category?: string;
  };
  setFilter: (filter: Partial<ContentStore['filter']>) => void;
  loadContents: () => Promise<void>;
  addContent: (item: ContentItem) => Promise<void>;
  addBulkContent: (items: ContentItem[]) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  updateContent: (
    id: string,
    updates: Partial<Pick<ContentItem, 'title' | 'tags' | 'category' | 'difficulty'>>,
  ) => Promise<void>;
  getFilteredItems: () => ContentItem[];
  getAllTags: () => { tag: string; count: number }[];
  getItemById: (id: string) => ContentItem | undefined;
  activeContentId: string | null;
  setActiveContentId: (id: string | null) => void;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  items: [],
  loading: false,
  filter: { search: '' },
  activeContentId: null,

  setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),

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

  updateContent: async (id, updates) => {
    await db.contents.update(id, { ...updates, updatedAt: Date.now() });
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i)),
    }));
  },

  getFilteredItems: () => {
    const { items, filter } = get();
    return items.filter((item) => {
      if (filter.type && item.type !== filter.type) return false;
      if (filter.difficulty && item.difficulty !== filter.difficulty) return false;
      if (filter.category && item.category !== filter.category) return false;
      if (filter.tags?.length) {
        if (!filter.tags.every((t) => item.tags.includes(t))) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.text.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  },

  getAllTags: () => {
    const { items } = get();
    const tagCounts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  },

  getItemById: (id) => {
    const { items } = get();
    return items.find((item) => item.id === id);
  },

  setActiveContentId: (activeContentId) => set({ activeContentId }),
}));
