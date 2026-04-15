import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createNewCard, type FSRSCardData, gradeCard, type Rating } from '@/lib/fsrs';
import type { Content } from '@/types/content';

interface LibraryState {
  contents: Content[];
  searchQuery: string;
  filterTags: string[];
  sortBy: 'recent' | 'title' | 'difficulty';
  showFavoritesOnly: boolean;

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

  // Favorites Actions
  toggleFavorite: (id: string) => void;
  getFavorites: () => Content[];
  setShowFavoritesOnly: (show: boolean) => void;

  // FSRS Actions
  gradeContent: (id: string, rating: Rating) => void;
  getDueContents: () => Content[];
  getDueCount: () => number;

  // Sample Data
  addSampleContents: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      contents: [],
      searchQuery: '',
      filterTags: [],
      sortBy: 'recent',
      showFavoritesOnly: false,

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

      // Favorites Actions
      toggleFavorite: (id) => {
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isFavorite: !c.isFavorite, updatedAt: Date.now() } : c,
          ),
        }));
      },

      getFavorites: () => {
        const { contents } = get();
        return contents.filter((c) => c.isFavorite);
      },

      setShowFavoritesOnly: (show) => {
        set({ showFavoritesOnly: show });
      },

      // FSRS Actions
      gradeContent: (id, rating) => {
        set((state) => ({
          contents: state.contents.map((c) => {
            if (c.id !== id) return c;

            const now = new Date();
            const { cardData, nextReview } = gradeCard(c.fsrsCard, rating, now);

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
        const sampleContents: Content[] = [
          {
            id: 'sample-1',
            title: 'The Power of Habit',
            text: 'Habits are the compound interest of self-improvement. The same way that money multiplies through compound interest, the effects of your habits multiply as you repeat them. They seem to make little difference on any given day and yet the impact they deliver over the months and years can be enormous.',
            content: '',
            source: 'text',
            difficulty: 'intermediate',
            language: 'en',
            tags: ['self-improvement', 'habits', 'productivity'],
            wordCount: 58,
            isFavorite: false,
            createdAt: Date.now() - 86400000 * 2,
            updatedAt: Date.now() - 86400000 * 2,
            fsrsCard: createNewCard(),
          },
          {
            id: 'sample-2',
            title: 'Daily Conversation',
            text: "Good morning! How are you today? I'm doing great, thanks for asking. The weather is beautiful outside. Would you like to go for a walk in the park? That sounds wonderful! Let's meet at 3 PM.",
            content: '',
            source: 'text',
            difficulty: 'beginner',
            language: 'en',
            tags: ['conversation', 'daily-life', 'beginner'],
            wordCount: 45,
            isFavorite: true,
            createdAt: Date.now() - 86400000 * 5,
            updatedAt: Date.now() - 86400000 * 5,
            fsrsCard: createNewCard(),
          },
          {
            id: 'sample-3',
            title: 'Climate Change',
            text: 'Climate change represents one of the most significant challenges facing humanity in the 21st century. Rising global temperatures, melting ice caps, and extreme weather events are just some of the consequences we are witnessing. Scientists emphasize the urgent need for collective action to reduce greenhouse gas emissions and transition to renewable energy sources.',
            content: '',
            source: 'text',
            difficulty: 'advanced',
            language: 'en',
            tags: ['science', 'environment', 'climate'],
            wordCount: 62,
            isFavorite: false,
            createdAt: Date.now() - 86400000 * 7,
            updatedAt: Date.now() - 86400000 * 7,
            fsrsCard: createNewCard(),
          },
          {
            id: 'sample-4',
            title: 'Learning English Tips',
            text: "Practice speaking every day, even if just for 10 minutes. Watch English movies with subtitles. Read books at your level. Join language exchange groups. Don't be afraid to make mistakes - they are part of learning!",
            content: '',
            source: 'text',
            difficulty: 'beginner',
            language: 'en',
            tags: ['learning', 'tips', 'education'],
            wordCount: 42,
            isFavorite: true,
            createdAt: Date.now() - 86400000 * 1,
            updatedAt: Date.now() - 86400000 * 1,
            fsrsCard: createNewCard(),
          },
          {
            id: 'sample-5',
            title: 'Technology and Society',
            text: 'The rapid advancement of artificial intelligence and automation is fundamentally transforming the nature of work and society. While these technologies offer tremendous potential benefits, they also raise important questions about employment, privacy, and the future of human creativity.',
            content: '',
            source: 'text',
            difficulty: 'advanced',
            language: 'en',
            tags: ['technology', 'AI', 'society'],
            wordCount: 48,
            isFavorite: false,
            createdAt: Date.now() - 86400000 * 3,
            updatedAt: Date.now() - 86400000 * 3,
            fsrsCard: createNewCard(),
          },
        ];

        set((state) => ({
          contents: [...sampleContents, ...state.contents],
        }));
      },
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
