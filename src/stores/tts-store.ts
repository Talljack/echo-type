import { create } from 'zustand';

const STORAGE_KEY = 'echotype_tts_settings';

export interface TTSSettings {
  voiceURI: string;  // SpeechSynthesisVoice.voiceURI
  speed: number;     // 0.5 - 2.0
  pitch: number;     // 0.5 - 2.0
  volume: number;    // 0 - 1
}

interface TTSStore extends TTSSettings {
  setVoiceURI: (uri: string) => void;
  setSpeed: (speed: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  hydrate: () => void;
}

function loadFromStorage(): Partial<TTSSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(settings: TTSSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

const defaults: TTSSettings = {
  voiceURI: '',
  speed: 1,
  pitch: 1,
  volume: 1,
};

export const useTTSStore = create<TTSStore>((set, get) => ({
  ...defaults,

  setVoiceURI: (voiceURI) => {
    set({ voiceURI });
    saveToStorage({ ...get(), voiceURI });
  },

  setSpeed: (speed) => {
    set({ speed });
    saveToStorage({ ...get(), speed });
  },

  setPitch: (pitch) => {
    set({ pitch });
    saveToStorage({ ...get(), pitch });
  },

  setVolume: (volume) => {
    set({ volume });
    saveToStorage({ ...get(), volume });
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));