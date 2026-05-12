import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { BUILTIN_COLLECTIONS } from '@/lib/builtin-collections';
import { db } from '@/lib/db';
import type { CollectionItem, ContentItem } from '@/types/content';

interface CollectionStore {
  collections: CollectionItem[];
  loading: boolean;
  seeded: boolean;
  loadCollections: (force?: boolean) => Promise<void>;
  seedBuiltinCollections: () => Promise<void>;
  addCollection: (collection: CollectionItem) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  getCollectionById: (id: string) => CollectionItem | undefined;
  getCollectionItems: (id: string) => Promise<ContentItem[]>;
}

const SEED_KEY = 'echotype_collections_seeded_v1';

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collections: [],
  loading: false,
  seeded: false,

  loadCollections: async (force?: boolean) => {
    if (!force && get().collections.length > 0) return;
    set({ loading: true });
    const collections = await db.collections.orderBy('createdAt').reverse().toArray();
    set({ collections, loading: false });
  },

  seedBuiltinCollections: async () => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(SEED_KEY)) {
      set({ seeded: true });
      return;
    }

    const existing = await db.collections.where('source').equals('builtin').count();
    if (existing > 0) {
      localStorage.setItem(SEED_KEY, '1');
      set({ seeded: true });
      return;
    }

    const now = Date.now();

    for (const builtin of BUILTIN_COLLECTIONS) {
      const contentItems: ContentItem[] = builtin.items.map((item) => ({
        id: nanoid(),
        title: item.text,
        text: item.text,
        type: item.type,
        category: `collection:${builtin.id}`,
        tags: builtin.tags,
        source: 'builtin' as const,
        difficulty: builtin.difficulty,
        createdAt: now,
        updatedAt: now,
      }));

      await db.contents.bulkAdd(contentItems);

      const collection: CollectionItem = {
        id: builtin.id,
        title: builtin.title,
        titleZh: builtin.titleZh,
        description: builtin.description,
        descriptionZh: builtin.descriptionZh,
        scenario: builtin.scenario,
        category: builtin.category,
        difficulty: builtin.difficulty,
        icon: builtin.icon,
        itemIds: contentItems.map((c) => c.id),
        tags: builtin.tags,
        source: 'builtin',
        createdAt: now,
        updatedAt: now,
      };

      await db.collections.add(collection);
    }

    localStorage.setItem(SEED_KEY, '1');
    set({ seeded: true });
  },

  addCollection: async (collection) => {
    await db.collections.add(collection);
    set((state) => ({ collections: [collection, ...state.collections] }));
  },

  deleteCollection: async (id) => {
    await db.collections.delete(id);
    set((state) => ({ collections: state.collections.filter((c) => c.id !== id) }));
  },

  getCollectionById: (id) => {
    return get().collections.find((c) => c.id === id);
  },

  getCollectionItems: async (id) => {
    const collection = get().collections.find((c) => c.id === id);
    if (!collection) return [];
    const items = await db.contents.where('id').anyOf(collection.itemIds).toArray();
    const orderMap = new Map(collection.itemIds.map((itemId, i) => [itemId, i]));
    return items.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  },
}));
