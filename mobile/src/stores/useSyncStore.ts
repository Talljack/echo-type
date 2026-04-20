import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isSupabaseConfigured } from '@/services/supabase';
import { fullSync } from '@/services/sync-engine';
import { useAuthStore } from '@/stores/useAuthStore';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
  pendingChanges: number;
  autoSync: boolean;
  lastSyncItems: number;
  lastSyncAttempt: number;

  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setSyncError: (error: string | null) => void;
  setPendingChanges: (count: number) => void;
  setAutoSync: (enabled: boolean) => void;
  /** Full bidirectional sync. Retries with exponential backoff on failure. */
  syncNow: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  pendingChanges: 0,
  autoSync: true,
  lastSyncItems: 0,
  lastSyncAttempt: 0,
};

const MAX_SYNC_ATTEMPTS = 3;

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      ...initialState,

      setIsSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setSyncError: (error) => set({ syncError: error }),
      setPendingChanges: (count) => set({ pendingChanges: count }),
      setAutoSync: (enabled) => set({ autoSync: enabled }),

      syncNow: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          set({ syncError: 'Not signed in' });
          return;
        }
        if (!isSupabaseConfigured()) {
          set({ syncError: 'Cloud sync is not configured' });
          return;
        }

        set({ isSyncing: true, syncError: null, lastSyncAttempt: Date.now() });

        let lastMessage = 'Sync failed';
        for (let attempt = 0; attempt < MAX_SYNC_ATTEMPTS; attempt++) {
          try {
            const result = await fullSync(userId);
            set({
              isSyncing: false,
              lastSyncTime: Date.now(),
              lastSyncItems: result.itemCount,
              syncError: null,
            });
            return;
          } catch (e) {
            lastMessage = e instanceof Error ? e.message : String(e);
            if (attempt < MAX_SYNC_ATTEMPTS - 1) {
              const backoff = 400 * 2 ** attempt;
              await sleep(backoff);
            }
          }
        }

        set({
          isSyncing: false,
          syncError: lastMessage,
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        lastSyncTime: s.lastSyncTime,
        syncError: s.syncError,
        pendingChanges: s.pendingChanges,
        autoSync: s.autoSync,
        lastSyncItems: s.lastSyncItems,
        lastSyncAttempt: s.lastSyncAttempt,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted ?? {}),
        isSyncing: false,
      }),
    },
  ),
);
