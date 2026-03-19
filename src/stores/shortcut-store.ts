import { create } from 'zustand';

import { SHORTCUT_MAP } from '@/lib/shortcut-definitions';

const STORAGE_KEY = 'echotype_shortcut_overrides';

export interface ShortcutOverrides {
  /** Map of shortcut id → custom key combo (e.g. "mod+k" → "mod+p") */
  overrides: Record<string, string>;
}

interface ShortcutStore extends ShortcutOverrides {
  /** Temporarily suspend shortcut handling while a modal/capture UI is open */
  isPaused: boolean;
  /** Get the effective key for a shortcut (override or default) */
  getKey: (id: string) => string;
  /** Set a custom binding for a shortcut */
  setOverride: (id: string, key: string) => void;
  /** Remove a custom binding, reverting to default */
  clearOverride: (id: string) => void;
  /** Reset all overrides */
  resetAll: () => void;
  setPaused: (paused: boolean) => void;
  hydrate: () => void;
}

function loadFromStorage(): Partial<ShortcutOverrides> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(overrides: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ overrides }));
  } catch {
    /* ignore */
  }
}

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  overrides: {},
  isPaused: false,

  getKey: (id: string) => {
    const override = get().overrides[id];
    if (override) return override;
    const def = SHORTCUT_MAP.get(id);
    return def?.defaultKey ?? '';
  },

  setOverride: (id, key) => {
    const overrides = { ...get().overrides, [id]: key };
    set({ overrides });
    saveToStorage(overrides);
  },

  clearOverride: (id) => {
    const overrides = { ...get().overrides };
    delete overrides[id];
    set({ overrides });
    saveToStorage(overrides);
  },

  resetAll: () => {
    set({ overrides: {} });
    saveToStorage({});
  },

  setPaused: (paused) => set({ isPaused: paused }),

  hydrate: () => {
    const saved = loadFromStorage();
    if (saved.overrides) {
      set({ overrides: saved.overrides });
    }
  },
}));
