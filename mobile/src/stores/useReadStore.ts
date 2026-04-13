import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ReadSession {
  id: string;
  contentId: string;
  duration: number; // seconds
  wordsRead: number;
  completedAt: number;
}

interface ReadState {
  sessions: ReadSession[];
  currentContentId: string | null;
  currentPosition: number; // character position in text
  selectedText: string;
  showTranslation: boolean;

  // Actions
  startSession: (contentId: string) => void;
  endSession: (duration: number, wordsRead: number) => void;
  setCurrentPosition: (position: number) => void;
  setSelectedText: (text: string) => void;
  setShowTranslation: (show: boolean) => void;
  getSessionsByContent: (contentId: string) => ReadSession[];
  getTotalReadTime: () => number;
  getTotalWordsRead: () => number;
}

export const useReadStore = create<ReadState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentContentId: null,
      currentPosition: 0,
      selectedText: '',
      showTranslation: false,

      startSession: (contentId) => {
        set({
          currentContentId: contentId,
          currentPosition: 0,
          selectedText: '',
        });
      },

      endSession: (duration, wordsRead) => {
        const { currentContentId } = get();
        if (!currentContentId) return;

        const session: ReadSession = {
          id: `read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: currentContentId,
          duration,
          wordsRead,
          completedAt: Date.now(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentContentId: null,
          currentPosition: 0,
          selectedText: '',
        }));
      },

      setCurrentPosition: (position) => {
        set({ currentPosition: position });
      },

      setSelectedText: (text) => {
        set({ selectedText: text });
      },

      setShowTranslation: (show) => {
        set({ showTranslation: show });
      },

      getSessionsByContent: (contentId) => {
        return get().sessions.filter((s) => s.contentId === contentId);
      },

      getTotalReadTime: () => {
        return get().sessions.reduce((total, session) => total + session.duration, 0);
      },

      getTotalWordsRead: () => {
        return get().sessions.reduce((total, session) => total + session.wordsRead, 0);
      },
    }),
    {
      name: 'read-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
