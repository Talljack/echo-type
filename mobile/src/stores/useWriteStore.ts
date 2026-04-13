import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TypingSession {
  id: string;
  contentId: string;
  accuracy: number; // 0-100
  wpm: number; // words per minute
  duration: number; // seconds
  completedAt: number;
}

interface WriteState {
  sessions: TypingSession[];
  currentContentId: string | null;
  currentInput: string;
  startTime: number | null;
  errors: number;

  // Actions
  startSession: (contentId: string) => void;
  endSession: (accuracy: number, wpm: number, duration: number) => void;
  setCurrentInput: (input: string) => void;
  setStartTime: (time: number | null) => void;
  incrementErrors: () => void;
  resetErrors: () => void;
  getSessionsByContent: (contentId: string) => TypingSession[];
  getTotalTypingTime: () => number;
  getAverageWPM: () => number;
  getAverageAccuracy: () => number;
}

export const useWriteStore = create<WriteState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentContentId: null,
      currentInput: '',
      startTime: null,
      errors: 0,

      startSession: (contentId) => {
        set({
          currentContentId: contentId,
          currentInput: '',
          startTime: Date.now(),
          errors: 0,
        });
      },

      endSession: (accuracy, wpm, duration) => {
        const { currentContentId } = get();
        if (!currentContentId) return;

        const session: TypingSession = {
          id: `write_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: currentContentId,
          accuracy,
          wpm,
          duration,
          completedAt: Date.now(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentContentId: null,
          currentInput: '',
          startTime: null,
          errors: 0,
        }));
      },

      setCurrentInput: (input) => {
        set({ currentInput: input });
      },

      setStartTime: (time) => {
        set({ startTime: time });
      },

      incrementErrors: () => {
        set((state) => ({ errors: state.errors + 1 }));
      },

      resetErrors: () => {
        set({ errors: 0 });
      },

      getSessionsByContent: (contentId) => {
        return get().sessions.filter((s) => s.contentId === contentId);
      },

      getTotalTypingTime: () => {
        return get().sessions.reduce((total, session) => total + session.duration, 0);
      },

      getAverageWPM: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const totalWPM = sessions.reduce((sum, session) => sum + session.wpm, 0);
        return Math.round(totalWPM / sessions.length);
      },

      getAverageAccuracy: () => {
        const sessions = get().sessions;
        if (sessions.length === 0) return 0;
        const totalAccuracy = sessions.reduce((sum, session) => sum + session.accuracy, 0);
        return Math.round(totalAccuracy / sessions.length);
      },
    }),
    {
      name: 'write-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
