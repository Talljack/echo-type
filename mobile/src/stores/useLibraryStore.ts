import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LibraryState {
  selectedBookId: string | null;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'title' | 'progress';
  filterDifficulty: string | null;

  setSelectedBook: (bookId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sort: 'recent' | 'title' | 'progress') => void;
  setFilterDifficulty: (difficulty: string | null) => void;
  reset: () => void;
}

const initialState = {
  selectedBookId: null,
  viewMode: 'grid' as const,
  sortBy: 'recent' as const,
  filterDifficulty: null,
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedBook: (bookId) => set({ selectedBookId: bookId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setFilterDifficulty: (difficulty) => set({ filterDifficulty: difficulty }),
      reset: () => set(initialState),
    }),
    {
      name: 'library-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
