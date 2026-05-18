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
  ensureBuiltinCollections: () => Promise<void>;
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
    try {
      const collections = await db.collections.orderBy('createdAt').reverse().toArray();
      set({ collections });
    } finally {
      set({ loading: false });
    }
  },

  seedBuiltinCollections: async () => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const existingBuiltins = await db.collections.bulkGet(BUILTIN_COLLECTIONS.map((builtin) => builtin.id));
    const existingIds = new Set(
      existingBuiltins
        .filter((collection): collection is CollectionItem => Boolean(collection))
        .map((collection) => collection.id),
    );
    const missingBuiltins = BUILTIN_COLLECTIONS.filter((builtin) => !existingIds.has(builtin.id));

    for (const builtin of missingBuiltins) {
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

      await db.collections.put(collection);
    }

    localStorage.setItem(SEED_KEY, '1');
    set({ seeded: true });
  },

  ensureBuiltinCollections: async () => {
    await get().seedBuiltinCollections();
    await get().loadCollections(true);
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
    const collection = get().collections.find((c) => c.id === id) ?? (await db.collections.get(id));
    if (!collection) return [];
    const items = await db.contents.where('id').anyOf(collection.itemIds).toArray();
    const orderMap = new Map(collection.itemIds.map((itemId, i) => [itemId, i]));
    return items.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  },
}));
