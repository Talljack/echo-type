import { create } from 'zustand';
import type { LearningGoal } from '@/lib/learning-goals';

const STORAGE_KEY = 'echotype_learning_goal';

interface LearningGoalStore {
  currentGoal: LearningGoal | null;
  setGoal: (goal: LearningGoal) => void;
  clearGoal: () => void;
  hydrate: () => void;
}

export const useLearningGoalStore = create<LearningGoalStore>((set) => ({
  currentGoal: null,

  setGoal: (goal) => {
    set({ currentGoal: goal });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, goal);
    }
  },

  clearGoal: () => {
    set({ currentGoal: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as LearningGoal | null;
    if (saved) {
      set({ currentGoal: saved });
    }
  },
}));
