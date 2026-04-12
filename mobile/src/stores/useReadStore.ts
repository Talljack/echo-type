import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ReadState {
  currentContentId: string | null;
  currentPosition: number;
  fontSize: number;
  highlightMode: boolean;
  showTranslation: boolean;

  setCurrentContent: (contentId: string | null) => void;
  setCurrentPosition: (position: number) => void;
  setFontSize: (size: number) => void;
  setHighlightMode: (enabled: boolean) => void;
  setShowTranslation: (show: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentContentId: null,
  currentPosition: 0,
  fontSize: 16,
  highlightMode: false,
  showTranslation: false,
};

export const useReadStore = create<ReadState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentContent: (contentId) => set({ currentContentId: contentId }),
      setCurrentPosition: (position) => set({ currentPosition: position }),
      setFontSize: (size) => set({ fontSize: size }),
      setHighlightMode: (enabled) => set({ highlightMode: enabled }),
      setShowTranslation: (show) => set({ showTranslation: show }),
      reset: () => set(initialState),
    }),
    {
      name: 'read-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
