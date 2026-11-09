import { create } from 'zustand';

export const APPEARANCE_STORAGE_KEY = 'echotype_appearance_settings';

export type Theme = 'light' | 'dark' | 'system';

interface AppearanceSettings {
  theme: Theme;
}

interface AppearanceStore extends AppearanceSettings {
  setTheme: (theme: Theme) => void;
  hydrate: () => void;
}

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

function loadSettings(): Partial<AppearanceSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    return parsed.theme && THEMES.includes(parsed.theme) ? { theme: parsed.theme } : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: AppearanceSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
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
    if (saved.theme) set({ theme: saved.theme });
  },
}));
