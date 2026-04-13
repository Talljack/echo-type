import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ListenSession {
  id: string;
  contentId: string;
  duration: number; // seconds
  completedAt: number;
}

interface ListenState {
  sessions: ListenSession[];
  currentContentId: string | null;
  isPlaying: boolean;
  speed: number;
  currentWordIndex: number;

  // Actions
  startSession: (contentId: string) => void;
  endSession: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setSpeed: (speed: number) => void;
  setCurrentWordIndex: (index: number) => void;
  getSessionsByContent: (contentId: string) => ListenSession[];
  getTotalListenTime: () => number;
}

export const useListenStore = create<ListenState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentContentId: null,
      isPlaying: false,
      speed: 1.0,
      currentWordIndex: 0,

      startSession: (contentId) => {
        set({
          currentContentId: contentId,
          currentWordIndex: 0,
        });
      },

      endSession: (duration) => {
        const { currentContentId } = get();
        if (!currentContentId) return;

        const session: ListenSession = {
          id: `listen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: currentContentId,
          duration,
          completedAt: Date.now(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentContentId: null,
          isPlaying: false,
          currentWordIndex: 0,
        }));
      },

      setIsPlaying: (isPlaying) => {
        set({ isPlaying });
      },

      setSpeed: (speed) => {
        set({ speed });
      },

      setCurrentWordIndex: (index) => {
        set({ currentWordIndex: index });
      },

      getSessionsByContent: (contentId) => {
        return get().sessions.filter((s) => s.contentId === contentId);
      },

      getTotalListenTime: () => {
        return get().sessions.reduce((total, session) => total + session.duration, 0);
      },
    }),
    {
      name: 'listen-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
