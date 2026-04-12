import { Q } from '@nozbe/watermelondb';
import { create } from 'zustand';
import { type Content as ContentModel, database } from '@/database';
import type { Content } from '@/types';

interface ContentStore {
  contents: Content[];
  selectedContent: Content | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchContents: () => Promise<void>;
  getContentById: (id: string) => Promise<Content | null>;
  createContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Content>;
  updateContent: (id: string, updates: Partial<Content>) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  setSelectedContent: (content: Content | null) => void;
}

export const useContentStore = create<ContentStore>((set, _get) => ({
  contents: [],
  selectedContent: null,
  isLoading: false,
  error: null,

  fetchContents: async () => {
    set({ isLoading: true, error: null });
    try {
      const contentsCollection = database.get<ContentModel>('contents');
      const records = await contentsCollection
        .query(Q.where('is_deleted', false), Q.sortBy('updated_at', Q.desc))
        .fetch();

      const contents = records.map((record) => ({
        id: record.id,
        title: record.title,
        type: record.type,
        content: record.content,
        language: record.language,
        difficulty: record.difficulty,
        tags: record.tags,
        source: record.source,
        sourceUrl: record.sourceUrl,
        coverImage: record.coverImage,
        duration: record.duration,
        wordCount: record.wordCount,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        lastAccessedAt: record.lastAccessedAt?.getTime(),
        isFavorite: record.isFavorite,
        progress: record.progress,
        metadata: record.metadata,
      }));

      set({ contents, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getContentById: async (id: string) => {
    try {
      const contentsCollection = database.get<ContentModel>('contents');
      const record = await contentsCollection.find(id);

      return {
        id: record.id,
        title: record.title,
        type: record.type,
        content: record.content,
        language: record.language,
        difficulty: record.difficulty,
        tags: record.tags,
        source: record.source,
        sourceUrl: record.sourceUrl,
        coverImage: record.coverImage,
        duration: record.duration,
        wordCount: record.wordCount,
        createdAt: record.createdAt.getTime(),
        updatedAt: record.updatedAt.getTime(),
        lastAccessedAt: record.lastAccessedAt?.getTime(),
        isFavorite: record.isFavorite,
        progress: record.progress,
        metadata: record.metadata,
      };
    } catch (error) {
      console.error('Failed to get content:', error);
      return null;
    }
  },

  createContent: async (contentData) => {
    try {
      const newRecord = await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        return await contentsCollection.create((record) => {
          record.title = contentData.title;
          record.type = contentData.type;
          record.content = contentData.content;
          record.language = contentData.language;
          record.difficulty = contentData.difficulty;
          record.tags = contentData.tags;
          record.source = contentData.source;
          record.sourceUrl = contentData.sourceUrl;
          record.coverImage = contentData.coverImage;
          record.duration = contentData.duration;
          record.wordCount = contentData.wordCount;
          record.isFavorite = contentData.isFavorite;
          record.progress = contentData.progress;
          record.metadata = contentData.metadata;
          record.isDeleted = false;
        });
      });

      const newContent = {
        id: newRecord.id,
        ...contentData,
        createdAt: newRecord.createdAt.getTime(),
        updatedAt: newRecord.updatedAt.getTime(),
      };

      set((state) => ({ contents: [newContent, ...state.contents] }));
      return newContent;
    } catch (error) {
      throw new Error(`Failed to create content: ${(error as Error).message}`);
    }
  },

  updateContent: async (id, updates) => {
    try {
      await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        const record = await contentsCollection.find(id);
        await record.update((r) => {
          if (updates.title !== undefined) r.title = updates.title;
          if (updates.content !== undefined) r.content = updates.content;
          if (updates.tags !== undefined) r.tags = updates.tags;
          if (updates.isFavorite !== undefined) r.isFavorite = updates.isFavorite;
          if (updates.progress !== undefined) r.progress = updates.progress;
        });
      });

      set((state) => ({
        contents: state.contents.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
      }));
    } catch (error) {
      throw new Error(`Failed to update content: ${(error as Error).message}`);
    }
  },

  deleteContent: async (id) => {
    try {
      await database.write(async () => {
        const contentsCollection = database.get<ContentModel>('contents');
        const record = await contentsCollection.find(id);
        await record.update((r) => {
          r.isDeleted = true;
        });
      });

      set((state) => ({
        contents: state.contents.filter((c) => c.id !== id),
      }));
    } catch (error) {
      throw new Error(`Failed to delete content: ${(error as Error).message}`);
    }
  },

  setSelectedContent: (content) => set({ selectedContent: content }),
}));
