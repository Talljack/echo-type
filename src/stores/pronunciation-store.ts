import { create } from 'zustand';
import type { PronunciationProvider } from '@/lib/pronunciation/types';

const STORAGE_KEY = 'echotype_pronunciation_settings';

interface PronunciationSettings {
  speechSuperAppKey: string;
  speechSuperSecretKey: string;
  monthlyLimit: number;
  provider: PronunciationProvider;
}

interface PronunciationStore extends PronunciationSettings {
  setSpeechSuperAppKey: (key: string) => void;
  setSpeechSuperSecretKey: (key: string) => void;
  setMonthlyLimit: (limit: number) => void;
  setProvider: (provider: PronunciationProvider) => void;
  hydrate: () => void;
}

function loadSettings(): Partial<PronunciationSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(settings: PronunciationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

function getSnapshot(state: PronunciationStore): PronunciationSettings {
  return {
    speechSuperAppKey: state.speechSuperAppKey,
    speechSuperSecretKey: state.speechSuperSecretKey,
    monthlyLimit: state.monthlyLimit,
    provider: state.provider,
  };
}

export const usePronunciationStore = create<PronunciationStore>((set, get) => ({
  speechSuperAppKey: '',
  speechSuperSecretKey: '',
  monthlyLimit: 1000,
  provider: 'auto',

  setSpeechSuperAppKey: (key) => {
    set({ speechSuperAppKey: key });
    saveSettings(getSnapshot({ ...get(), speechSuperAppKey: key }));
  },

  setSpeechSuperSecretKey: (key) => {
    set({ speechSuperSecretKey: key });
    saveSettings(getSnapshot({ ...get(), speechSuperSecretKey: key }));
  },

  setMonthlyLimit: (limit) => {
    set({ monthlyLimit: limit });
    saveSettings(getSnapshot({ ...get(), monthlyLimit: limit }));
  },

  setProvider: (provider) => {
    set({ provider });
    saveSettings(getSnapshot({ ...get(), provider }));
  },

  hydrate: () => {
    const saved = loadSettings();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));
