import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ReviewState {
  reviewQueue: string[];
  currentReviewIndex: number;
  reviewMode: 'spaced' | 'random';
  showAnswer: boolean;
  todayReviewCount: number;
  lastReviewDate: string | null;

  setReviewQueue: (queue: string[]) => void;
  setCurrentReviewIndex: (index: number) => void;
  setReviewMode: (mode: 'spaced' | 'random') => void;
  setShowAnswer: (show: boolean) => void;
  incrementReviewCount: () => void;
  resetDailyCount: () => void;
  reset: () => void;
}

const initialState = {
  reviewQueue: [],
  currentReviewIndex: 0,
  reviewMode: 'spaced' as const,
  showAnswer: false,
  todayReviewCount: 0,
  lastReviewDate: null,
};

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setReviewQueue: (queue) => set({ reviewQueue: queue }),
      setCurrentReviewIndex: (index) => set({ currentReviewIndex: index }),
      setReviewMode: (mode) => set({ reviewMode: mode }),
      setShowAnswer: (show) => set({ showAnswer: show }),
      incrementReviewCount: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastReviewDate, todayReviewCount } = get();

        if (lastReviewDate !== today) {
          set({ todayReviewCount: 1, lastReviewDate: today });
        } else {
          set({ todayReviewCount: todayReviewCount + 1 });
        }
      },
      resetDailyCount: () => set({ todayReviewCount: 0, lastReviewDate: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'review-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
