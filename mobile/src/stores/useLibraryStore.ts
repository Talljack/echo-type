import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { gradeCard, type Rating } from '@/lib/fsrs';
import { getSeedContents, hasBeenSeeded, markSeeded } from '@/lib/seed';
import type { Content } from '@/types/content';

interface LibraryState {
  contents: Content[];
  searchQuery: string;
  filterTags: string[];
  sortBy: 'recent' | 'title' | 'difficulty';
  showStarredOnly: boolean;

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

  toggleStarred: (id: string) => void;
  getStarredContents: () => Content[];
  setShowStarredOnly: (show: boolean) => void;

  // FSRS Actions
  gradeContent: (id: string, rating: Rating) => void;
  getDueContents: () => Content[];
  getDueCount: () => number;

  // Sample / Seed Data
  addSampleContents: () => void;
  seedIfNeeded: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      contents: [],
      searchQuery: '',
      filterTags: [],
      sortBy: 'recent',
      showStarredOnly: false,

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
        return contents.filter((c) => {
          const textContent = c.text || c.content;
          return (
            c.title.toLowerCase().includes(lowerQuery) ||
            textContent.toLowerCase().includes(lowerQuery) ||
            c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
          );
        });
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

      toggleStarred: (id) => {
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isStarred: !c.isStarred, updatedAt: Date.now() } : c,
          ),
        }));
      },

      getStarredContents: () => {
        const { contents } = get();
        return contents.filter((c) => c.isStarred);
      },

      setShowStarredOnly: (show) => {
        set({ showStarredOnly: show });
      },

      // FSRS Actions
      gradeContent: (id, rating) => {
        set((state) => ({
          contents: state.contents.map((c) => {
            if (c.id !== id) return c;

            const now = new Date();
            const { cardData } = gradeCard(c.fsrsCard, rating, now);

            return {
              ...c,
              fsrsCard: cardData,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getDueContents: () => {
        const { contents } = get();
        const now = Date.now();
        return contents.filter((c) => {
          if (!c.fsrsCard) return false;
          return c.fsrsCard.due <= now;
        });
      },

      getDueCount: () => {
        return get().getDueContents().length;
      },

      addSampleContents: () => {
        const seedContents = getSeedContents();
        set((state) => ({
          contents: [...seedContents, ...state.contents],
        }));
      },

      seedIfNeeded: async () => {
        const seeded = await hasBeenSeeded();
        if (seeded) return;

        // Wait briefly for zustand persist rehydration
        await new Promise((r) => setTimeout(r, 100));

        const { contents } = get();
        if (contents.length > 0) {
          await markSeeded();
          return;
        }

        const seedContents = getSeedContents();
        set({ contents: seedContents });
        await markSeeded();
      },
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<LibraryState> & { showFavoritesOnly?: boolean };
        const contentsRaw = p.contents ?? currentState.contents;
        const contents = contentsRaw.map((c) => {
          const legacy = c as Content & { isFavorite?: boolean };
          if (typeof legacy.isFavorite === 'boolean' && legacy.isStarred === undefined) {
            const { isFavorite: _f, ...rest } = legacy;
            return { ...rest, isStarred: legacy.isFavorite } as Content;
          }
          return c;
        });
        const showStarredOnly =
          typeof p.showStarredOnly === 'boolean'
            ? p.showStarredOnly
            : typeof p.showFavoritesOnly === 'boolean'
              ? p.showFavoritesOnly
              : currentState.showStarredOnly;
        return {
          ...currentState,
          ...p,
          contents,
          showStarredOnly,
        };
      },
    },
  ),
);
