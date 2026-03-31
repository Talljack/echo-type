import { create } from 'zustand';

const STORAGE_KEY = 'echotype_language_settings';

export type InterfaceLanguage = 'en' | 'zh';

interface LanguageSettings {
  interfaceLanguage: InterfaceLanguage;
  hasExplicitPreference: boolean;
}

interface LanguageStore extends LanguageSettings {
  setInterfaceLanguage: (lang: InterfaceLanguage) => void;
  initialized: boolean;
  initialize: () => void;
  hydrate: () => void;
}

function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return value === 'en' || value === 'zh';
}

export function detectInterfaceLanguage(browserLanguage?: string | null): InterfaceLanguage {
  if (!browserLanguage) return 'en';
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function loadSettings(): Partial<LanguageSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<LanguageSettings>;
    if (!isInterfaceLanguage(parsed.interfaceLanguage)) return {};

    return {
      interfaceLanguage: parsed.interfaceLanguage,
      hasExplicitPreference: parsed.hasExplicitPreference === true,
    };
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
  hasExplicitPreference: false,
  initialized: false,

  setInterfaceLanguage: (interfaceLanguage) => {
    set({ interfaceLanguage, hasExplicitPreference: true, initialized: true });
    saveSettings({ interfaceLanguage, hasExplicitPreference: true });
  },

  initialize: () => {
    const saved = loadSettings();

    if (saved.interfaceLanguage && saved.hasExplicitPreference) {
      set({
        interfaceLanguage: saved.interfaceLanguage,
        hasExplicitPreference: true,
        initialized: true,
      });
      return;
    }

    const detectedLanguage =
      typeof navigator !== 'undefined' ? detectInterfaceLanguage(navigator.language) : detectInterfaceLanguage();

    set({
      interfaceLanguage: saved.interfaceLanguage ?? detectedLanguage,
      hasExplicitPreference: false,
      initialized: true,
    });
  },

  hydrate: () => {
    useLanguageStore.getState().initialize();
  },
}));
