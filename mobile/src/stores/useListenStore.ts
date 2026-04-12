import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ListenState {
  currentContentId: string | null;
  isPlaying: boolean;
  playbackRate: number;
  currentPosition: number;
  repeatMode: 'off' | 'one' | 'all';

  setCurrentContent: (contentId: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentPosition: (position: number) => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  reset: () => void;
}

const initialState = {
  currentContentId: null,
  isPlaying: false,
  playbackRate: 1.0,
  currentPosition: 0,
  repeatMode: 'off' as const,
};

export const useListenStore = create<ListenState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentContent: (contentId) => set({ currentContentId: contentId }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setCurrentPosition: (position) => set({ currentPosition: position }),
      setRepeatMode: (mode) => set({ repeatMode: mode }),
      reset: () => set(initialState),
    }),
    {
      name: 'listen-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
