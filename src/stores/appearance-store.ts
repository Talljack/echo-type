import { create } from 'zustand';

const STORAGE_KEY = 'echotype_appearance_settings';

export type Theme = 'light' | 'dark' | 'system';

interface AppearanceSettings {
  theme: Theme;
}

interface AppearanceStore extends AppearanceSettings {
  setTheme: (theme: Theme) => void;
  hydrate: () => void;
}

function loadSettings(): Partial<AppearanceSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(settings: AppearanceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export const useAppearanceStore = create<AppearanceStore>((set) => ({
  theme: 'system',

  setTheme: (theme) => {
    set({ theme });
    saveSettings({ theme });
  },

  hydrate: () => {
    const saved = loadSettings();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));
