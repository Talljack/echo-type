import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { SyncEngine } from '@/lib/sync/engine';

const STORAGE_KEY = 'echotype_sync_settings';

interface SyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
  isSyncEnabled: boolean;
  // Actions
  triggerFullSync: () => Promise<void>;
  triggerIncrementalSync: () => Promise<void>;
  setSyncEnabled: (enabled: boolean) => void;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  hydrate: () => void;
}

let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

function loadFromStorage(): { isSyncEnabled: boolean; lastSyncedAt: string | null } {
  if (typeof window === 'undefined') return { isSyncEnabled: false, lastSyncedAt: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isSyncEnabled: parsed.isSyncEnabled ?? false,
        lastSyncedAt: parsed.lastSyncedAt ?? null,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { isSyncEnabled: false, lastSyncedAt: null };
}

function saveToStorage(state: { isSyncEnabled: boolean; lastSyncedAt: string | null }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  isSyncEnabled: false,

  hydrate: () => {
    const stored = loadFromStorage();
    set({ isSyncEnabled: stored.isSyncEnabled, lastSyncedAt: stored.lastSyncedAt });
  },

  triggerFullSync: async () => {
    const { isSyncEnabled } = get();
    if (!isSyncEnabled) return;

    set({ status: 'syncing', error: null });

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        set({ status: 'error', error: 'Not authenticated' });
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        set({ status: 'error', error: 'Supabase not configured' });
        return;
      }
      const engine = new SyncEngine(supabase, userId);
      const result = await engine.fullSync();

      if (result.errors.length > 0) {
        set({
          status: 'error',
          error: result.errors.join('; '),
          lastSyncedAt: new Date().toISOString(),
        });
      } else {
        set({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          error: null,
        });
      }

      saveToStorage({
        isSyncEnabled: get().isSyncEnabled,
        lastSyncedAt: get().lastSyncedAt,
      });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  triggerIncrementalSync: async () => {
    const { isSyncEnabled, status } = get();
    if (!isSyncEnabled || status === 'syncing') return;

    set({ status: 'syncing', error: null });

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        set({ status: 'error', error: 'Not authenticated' });
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        set({ status: 'error', error: 'Supabase not configured' });
        return;
      }
      const engine = new SyncEngine(supabase, userId);
      const result = await engine.incrementalSync();

      if (result.errors.length > 0) {
        set({
          status: 'error',
          error: result.errors.join('; '),
          lastSyncedAt: new Date().toISOString(),
        });
      } else {
        set({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          error: null,
        });
      }

      saveToStorage({
        isSyncEnabled: get().isSyncEnabled,
        lastSyncedAt: get().lastSyncedAt,
      });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  setSyncEnabled: (enabled: boolean) => {
    set({ isSyncEnabled: enabled });
    saveToStorage({ isSyncEnabled: enabled, lastSyncedAt: get().lastSyncedAt });

    if (enabled) {
      get().startAutoSync();
    } else {
      get().stopAutoSync();
    }
  },

  startAutoSync: () => {
    if (autoSyncInterval) return;
    autoSyncInterval = setInterval(
      () => {
        void get().triggerIncrementalSync();
      },
      30 * 1000, // 30 seconds
    );
  },

  stopAutoSync: () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  },
}));
