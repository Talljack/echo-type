import { create } from 'zustand';

const STORAGE_KEY = 'echotype_tts_settings';

export interface TTSSettings {
  voiceURI: string; // SpeechSynthesisVoice.voiceURI
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
  targetLang: string;
  showTranslation: boolean;
  recommendationsEnabled: boolean;
  recommendationsCount: number;
  openaiKey: string;
  anthropicKey: string;
  deepseekKey: string;
  shadowReadingEnabled: boolean;
}

interface TTSStore extends TTSSettings {
  setVoiceURI: (uri: string) => void;
  setSpeed: (speed: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setTargetLang: (lang: string) => void;
  setShowTranslation: (show: boolean) => void;
  toggleTranslation: () => void;
  setRecommendationsEnabled: (enabled: boolean) => void;
  setRecommendationsCount: (count: number) => void;
  setOpenaiKey: (key: string) => void;
  setAnthropicKey: (key: string) => void;
  setDeepseekKey: (key: string) => void;
  setShadowReadingEnabled: (enabled: boolean) => void;
  hydrate: () => void;
}

function loadFromStorage(): Partial<TTSSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(settings: TTSSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const defaults: TTSSettings = {
  voiceURI: '',
  speed: 1,
  pitch: 1,
  volume: 1,
  targetLang: 'zh-CN',
  showTranslation: true,
  recommendationsEnabled: true,
  recommendationsCount: 5,
  openaiKey: '',
  anthropicKey: '',
  deepseekKey: '',
  shadowReadingEnabled: false,
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

  setTargetLang: (targetLang) => {
    set({ targetLang });
    saveToStorage({ ...get(), targetLang });
  },

  setShowTranslation: (showTranslation) => {
    set({ showTranslation });
    saveToStorage({ ...get(), showTranslation });
  },

  toggleTranslation: () => {
    const showTranslation = !get().showTranslation;
    set({ showTranslation });
    saveToStorage({ ...get(), showTranslation });
  },

  setRecommendationsEnabled: (recommendationsEnabled) => {
    set({ recommendationsEnabled });
    saveToStorage({ ...get(), recommendationsEnabled });
  },

  setRecommendationsCount: (recommendationsCount) => {
    set({ recommendationsCount });
    saveToStorage({ ...get(), recommendationsCount });
  },

  setOpenaiKey: (openaiKey) => {
    set({ openaiKey });
    saveToStorage({ ...get(), openaiKey });
  },

  setAnthropicKey: (anthropicKey) => {
    set({ anthropicKey });
    saveToStorage({ ...get(), anthropicKey });
  },

  setDeepseekKey: (deepseekKey) => {
    set({ deepseekKey });
    saveToStorage({ ...get(), deepseekKey });
  },

  setShadowReadingEnabled: (shadowReadingEnabled) => {
    set({ shadowReadingEnabled });
    saveToStorage({ ...get(), shadowReadingEnabled });
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));
