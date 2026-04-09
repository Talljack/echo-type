import { create } from 'zustand';
import { DEFAULT_KOKORO_SERVER_URL } from '@/lib/kokoro-shared';

const STORAGE_KEY = 'echotype_tts_settings';

export type TTSSource = 'browser' | 'fish' | 'kokoro';

export interface TTSSettings {
  voiceSource: TTSSource;
  voiceURI: string; // SpeechSynthesisVoice.voiceURI
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0 - 1
  fishApiKey: string;
  fishVoiceId: string;
  fishVoiceName: string;
  fishModel: string;
  kokoroServerUrl: string;
  kokoroApiKey: string;
  kokoroVoiceId: string;
  kokoroVoiceName: string;
  targetLang: string;
  recommendationsEnabled: boolean;
  recommendationsCount: number;
  openaiKey: string;
  anthropicKey: string;
  deepseekKey: string;
}

interface TTSStore extends TTSSettings {
  setVoiceSource: (source: TTSSource) => void;
  setVoiceURI: (uri: string) => void;
  setSpeed: (speed: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setFishApiKey: (key: string) => void;
  setFishVoice: (voiceId: string, voiceName?: string) => void;
  setFishModel: (model: string) => void;
  setKokoroServerUrl: (url: string) => void;
  setKokoroApiKey: (key: string) => void;
  setKokoroVoice: (voiceId: string, voiceName?: string) => void;
  setTargetLang: (lang: string) => void;
  setRecommendationsEnabled: (enabled: boolean) => void;
  setRecommendationsCount: (count: number) => void;
  setOpenaiKey: (key: string) => void;
  setAnthropicKey: (key: string) => void;
  setDeepseekKey: (key: string) => void;
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
  voiceSource: 'browser',
  voiceURI: '',
  speed: 1,
  pitch: 1,
  volume: 1,
  fishApiKey: '',
  fishVoiceId: '',
  fishVoiceName: '',
  fishModel: 's2-pro',
  kokoroServerUrl: DEFAULT_KOKORO_SERVER_URL,
  kokoroApiKey: '',
  kokoroVoiceId: 'af_heart',
  kokoroVoiceName: 'Heart',
  targetLang: 'zh-CN',
  recommendationsEnabled: true,
  recommendationsCount: 5,
  openaiKey: '',
  anthropicKey: '',
  deepseekKey: '',
};

export const useTTSStore = create<TTSStore>((set, get) => ({
  ...defaults,

  setVoiceSource: (voiceSource) => {
    set({ voiceSource });
    saveToStorage({ ...get(), voiceSource });
  },

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

  setFishApiKey: (fishApiKey) => {
    set({ fishApiKey });
    saveToStorage({ ...get(), fishApiKey });
  },

  setFishVoice: (fishVoiceId, fishVoiceName = '') => {
    set({ fishVoiceId, fishVoiceName });
    saveToStorage({ ...get(), fishVoiceId, fishVoiceName });
  },

  setFishModel: (fishModel) => {
    set({ fishModel });
    saveToStorage({ ...get(), fishModel });
  },

  setKokoroServerUrl: (kokoroServerUrl) => {
    set({ kokoroServerUrl });
    saveToStorage({ ...get(), kokoroServerUrl });
  },

  setKokoroApiKey: (kokoroApiKey) => {
    set({ kokoroApiKey });
    saveToStorage({ ...get(), kokoroApiKey });
  },

  setKokoroVoice: (kokoroVoiceId, kokoroVoiceName = '') => {
    set({ kokoroVoiceId, kokoroVoiceName });
    saveToStorage({ ...get(), kokoroVoiceId, kokoroVoiceName });
  },

  setTargetLang: (targetLang) => {
    set({ targetLang });
    saveToStorage({ ...get(), targetLang });
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

  hydrate: () => {
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      // Don't overwrite the default Kokoro server URL with an empty string
      if ('kokoroServerUrl' in saved && !saved.kokoroServerUrl?.trim()) {
        delete saved.kokoroServerUrl;
      }
      set(saved);
    }
  },
}));
