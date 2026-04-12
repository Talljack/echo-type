import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WriteState {
  currentContentId: string | null;
  typingMode: 'practice' | 'test';
  showKeyboard: boolean;
  enableHints: boolean;
  currentWPM: number;
  currentAccuracy: number;

  setCurrentContent: (contentId: string | null) => void;
  setTypingMode: (mode: 'practice' | 'test') => void;
  setShowKeyboard: (show: boolean) => void;
  setEnableHints: (enabled: boolean) => void;
  setCurrentWPM: (wpm: number) => void;
  setCurrentAccuracy: (accuracy: number) => void;
  reset: () => void;
}

const initialState = {
  currentContentId: null,
  typingMode: 'practice' as const,
  showKeyboard: true,
  enableHints: true,
  currentWPM: 0,
  currentAccuracy: 0,
};

export const useWriteStore = create<WriteState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentContent: (contentId) => set({ currentContentId: contentId }),
      setTypingMode: (mode) => set({ typingMode: mode }),
      setShowKeyboard: (show) => set({ showKeyboard: show }),
      setEnableHints: (enabled) => set({ enableHints: enabled }),
      setCurrentWPM: (wpm) => set({ currentWPM: wpm }),
      setCurrentAccuracy: (accuracy) => set({ currentAccuracy: accuracy }),
      reset: () => set(initialState),
    }),
    {
      name: 'write-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
