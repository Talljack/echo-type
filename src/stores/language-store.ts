import { create } from 'zustand';

const STORAGE_KEY = 'echotype_language_settings';

export type InterfaceLanguage = 'en' | 'zh';

interface LanguageSettings {
  interfaceLanguage: InterfaceLanguage;
}

interface LanguageStore extends LanguageSettings {
  setInterfaceLanguage: (lang: InterfaceLanguage) => void;
  hydrate: () => void;
}

function loadSettings(): Partial<LanguageSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(settings: LanguageSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  interfaceLanguage: 'en',

  setInterfaceLanguage: (interfaceLanguage) => {
    set({ interfaceLanguage });
    saveSettings({ interfaceLanguage });
  },

  hydrate: () => {
    const saved = loadSettings();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));
