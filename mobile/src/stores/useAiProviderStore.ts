import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AI_PROVIDER_IDS,
  type AIProviderAuthState,
  type AIProviderConfig,
  type AIProviderId,
  type AIProviderModel,
  buildLegacyProviderConfig,
  createDefaultAiProviderConfig,
  isAiProviderConfigReady,
} from '@/lib/ai-providers';
import type { Settings } from '@/types';

function buildDefaultConfigs(): Record<AIProviderId, AIProviderConfig> {
  return Object.fromEntries(AI_PROVIDER_IDS.map((id) => [id, createDefaultAiProviderConfig(id)])) as Record<
    AIProviderId,
    AIProviderConfig
  >;
}

interface AiProviderState {
  providers: Record<AIProviderId, AIProviderConfig>;
  activeProviderId: AIProviderId;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setActiveProvider: (providerId: AIProviderId) => void;
  setAuth: (providerId: AIProviderId, auth: AIProviderAuthState) => void;
  clearAuth: (providerId: AIProviderId) => void;
  setSelectedModel: (providerId: AIProviderId, modelId: string) => void;
  setDynamicModels: (providerId: AIProviderId, models: AIProviderModel[]) => void;
  setBaseUrl: (providerId: AIProviderId, baseUrl: string) => void;
  migrateLegacySettings: (settings: Pick<Settings, 'aiProvider' | 'aiApiKey' | 'aiBaseUrl' | 'aiModel'>) => void;
  getActiveProviderConfig: () => AIProviderConfig;
  hasAnyConfiguredProvider: () => boolean;
}

export const useAiProviderStore = create<AiProviderState>()(
  persist(
    (set, get) => ({
      providers: buildDefaultConfigs(),
      activeProviderId: 'groq',
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setActiveProvider: (providerId) => set({ activeProviderId: providerId }),
      setAuth: (providerId, auth) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              auth,
            },
          },
        })),
      clearAuth: (providerId) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              auth: { type: 'none' },
              dynamicModels: [],
            },
          },
        })),
      setSelectedModel: (providerId, modelId) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              selectedModelId: modelId,
            },
          },
        })),
      setDynamicModels: (providerId, models) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              dynamicModels: models,
            },
          },
        })),
      setBaseUrl: (providerId, baseUrl) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [providerId]: {
              ...state.providers[providerId],
              baseUrl,
            },
          },
        })),
      migrateLegacySettings: (settings) => {
        const legacyConfig = buildLegacyProviderConfig(settings);
        if (!legacyConfig) return;
        const state = get();
        if (state.hasAnyConfiguredProvider()) return;
        set((current) => ({
          activeProviderId: legacyConfig.providerId,
          providers: {
            ...current.providers,
            [legacyConfig.providerId]: legacyConfig,
          },
        }));
      },
      getActiveProviderConfig: () => {
        const state = get();
        return state.providers[state.activeProviderId];
      },
      hasAnyConfiguredProvider: () => Object.values(get().providers).some((config) => isAiProviderConfigReady(config)),
    }),
    {
      name: 'ai-provider-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
