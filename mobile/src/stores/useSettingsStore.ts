import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { setHapticsEnabled } from '@/lib/haptics';
import type { Settings } from '@/types';

const SETTINGS_KEY = 'echotype_settings';
const ONBOARDING_FALLBACK_KEY = 'echotype_onboarding_completed';

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

const getOnboardingFallback = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }
  return (await AsyncStorage.getItem(ONBOARDING_FALLBACK_KEY)) === 'true';
};

const setOnboardingFallback = async (completed: boolean): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await AsyncStorage.setItem(ONBOARDING_FALLBACK_KEY, completed ? 'true' : 'false');
};

const clearOnboardingFallback = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    return;
  }
  await AsyncStorage.removeItem(ONBOARDING_FALLBACK_KEY);
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
  theme: 'light',
  fontSize: 16,
  ttsProvider: 'edge',
  ttsVoice: 'en-US-AriaNeural',
  ttsSpeed: 1.0,
  sttProvider: 'whisper',
  translationProvider: 'google',
  autoSync: true,
  notifications: true,
  onboardingCompleted: false,

  // Audio & feedback
  hapticsEnabled: true,

  // Reminders
  dailyReminderEnabled: false,
  dailyReminderTime: '20:00',

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
      const onboardingCompletedFallback = await getOnboardingFallback();
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        const settings = {
          ...defaultSettings,
          ...parsed,
          onboardingCompleted: parsed.onboardingCompleted ?? onboardingCompletedFallback,
        };
        setHapticsEnabled(settings.hapticsEnabled);
        set({ settings, isLoading: false });
      } else {
        const settings = {
          ...defaultSettings,
          onboardingCompleted: onboardingCompletedFallback,
        };
        setHapticsEnabled(settings.hapticsEnabled);
        set({ settings, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      try {
        const onboardingCompletedFallback = await getOnboardingFallback();
        const settings = {
          ...defaultSettings,
          onboardingCompleted: onboardingCompletedFallback,
        };
        setHapticsEnabled(settings.hapticsEnabled);
        set({ settings, isLoading: false });
      } catch (fallbackError) {
        console.error('Failed to load onboarding fallback:', fallbackError);
        set({ isLoading: false });
      }
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    try {
      await setStorageItem(SETTINGS_KEY, JSON.stringify(newSettings));
      if (updates.onboardingCompleted !== undefined) {
        await setOnboardingFallback(updates.onboardingCompleted);
      }
      if (updates.hapticsEnabled !== undefined) {
        setHapticsEnabled(updates.hapticsEnabled);
      }
      set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await deleteStorageItem(SETTINGS_KEY);
      await clearOnboardingFallback();
      setHapticsEnabled(defaultSettings.hapticsEnabled);
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
