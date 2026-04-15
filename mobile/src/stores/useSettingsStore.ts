import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { Settings } from '@/types';

const SETTINGS_KEY = 'echotype_settings';

// Platform-specific storage helpers
const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const deleteStorageItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
}

const defaultSettings: Settings = {
  language: 'en',
  theme: 'system',
  fontSize: 16,
  ttsProvider: 'edge',
  ttsVoice: 'en-US-AriaNeural',
  ttsSpeed: 1.0,
  sttProvider: 'whisper',
  translationProvider: 'google',
  autoSync: true,
  notifications: true,
  onboardingCompleted: false,

  // AI Provider
  aiProvider: '',
  aiApiKey: '',
  aiBaseUrl: '',
  aiModel: '',

  // Translation
  translationTargetLang: 'zh',
  showListenTranslation: true,
  showReadTranslation: true,
  showSpeakTranslation: true,
  showWriteTranslation: false,

  // Recommendations
  enableRecommendations: true,
  recommendationCount: 5,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await getStorageItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        const settings = { ...defaultSettings, ...parsed };
        set({ settings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    try {
      await setStorageItem(SETTINGS_KEY, JSON.stringify(newSettings));
      set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await deleteStorageItem(SETTINGS_KEY);
      set({ settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  },

  setOnboardingCompleted: async (completed) => {
    await get().updateSettings({ onboardingCompleted: completed });
  },
}));
