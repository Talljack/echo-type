import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  pendingChanges: number;
  autoSync: boolean;

  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setSyncError: (error: string | null) => void;
  setPendingChanges: (count: number) => void;
  setAutoSync: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  pendingChanges: 0,
  autoSync: true,
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      ...initialState,

      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setSyncError: (error) => set({ syncError: error }),
      setPendingChanges: (count) => set({ pendingChanges: count }),
      setAutoSync: (enabled) => set({ autoSync: enabled }),
      reset: () => set(initialState),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
