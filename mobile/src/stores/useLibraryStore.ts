import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Content } from '@/lib/storage';

interface LibraryState {
  contents: Content[];
  searchQuery: string;
  filterTags: string[];
  sortBy: 'recent' | 'title' | 'difficulty';

  // Actions
  addContent: (content: Content) => void;
  updateContent: (id: string, updates: Partial<Content>) => void;
  deleteContent: (id: string) => void;
  getContent: (id: string) => Content | undefined;
  searchContents: (query: string) => Content[];
  filterByTags: (tags: string[]) => Content[];
  setSearchQuery: (query: string) => void;
  setFilterTags: (tags: string[]) => void;
  setSortBy: (sortBy: 'recent' | 'title' | 'difficulty') => void;
  getAllTags: () => string[];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      contents: [],
      searchQuery: '',
      filterTags: [],
      sortBy: 'recent',

      addContent: (content) => {
        set((state) => ({
          contents: [content, ...state.contents],
        }));
      },

      updateContent: (id, updates) => {
        set((state) => ({
          contents: state.contents.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c)),
        }));
      },

      deleteContent: (id) => {
        set((state) => ({
          contents: state.contents.filter((c) => c.id !== id),
        }));
      },

      getContent: (id) => {
        return get().contents.find((c) => c.id === id);
      },

      searchContents: (query) => {
        const { contents } = get();
        if (!query.trim()) return contents;

        const lowerQuery = query.toLowerCase();
        return contents.filter(
          (c) =>
            c.title.toLowerCase().includes(lowerQuery) ||
            c.text.toLowerCase().includes(lowerQuery) ||
            c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
        );
      },

      filterByTags: (tags) => {
        const { contents } = get();
        if (tags.length === 0) return contents;

        return contents.filter((c) => tags.every((tag) => c.tags.includes(tag)));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setFilterTags: (tags) => {
        set({ filterTags: tags });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      getAllTags: () => {
        const { contents } = get();
        const tagSet = new Set<string>();
        for (const content of contents) {
          for (const tag of content.tags) {
            tagSet.add(tag);
          }
        }
        return Array.from(tagSet).sort();
      },
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
