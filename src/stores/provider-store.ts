import { create } from 'zustand';
import {
  type ProviderId,
  type ProviderAuthState,
  type ProviderConfig,
  type ProviderModel,
  PROVIDER_REGISTRY,
  getDefaultModelId,
  PROVIDER_IDS,
} from '@/lib/providers';

const STORAGE_KEY = 'echotype_provider_config';

export type OllamaStatus = 'idle' | 'preloading' | 'ready' | 'generating' | 'error';

interface ProviderStore {
  providers: Record<ProviderId, ProviderConfig>;
  activeProviderId: ProviderId;
  ollamaModelStatus: OllamaStatus;
  ollamaFirstUse: boolean;

  setActiveProvider: (id: ProviderId) => void;
  setSelectedModel: (providerId: ProviderId, modelId: string) => void;
  setAuth: (providerId: ProviderId, auth: ProviderAuthState) => void;
  clearAuth: (providerId: ProviderId) => void;
  setDynamicModels: (providerId: ProviderId, models: ProviderModel[]) => void;
  setBaseUrl: (providerId: ProviderId, baseUrl: string) => void;
  setApiPath: (providerId: ProviderId, apiPath: string) => void;
  setNoModelApi: (providerId: ProviderId, value: boolean) => void;
  setOllamaStatus: (status: OllamaStatus) => void;
  setOllamaFirstUse: (isFirstUse: boolean) => void;
  isConnected: (providerId: ProviderId) => boolean;
  getActiveConfig: () => ProviderConfig;
  hydrate: () => void;
}

function buildDefaults(): Record<ProviderId, ProviderConfig> {
  const configs = {} as Record<ProviderId, ProviderConfig>;
  for (const id of PROVIDER_IDS) {
    configs[id] = {
      providerId: id,
      auth: { type: 'none' },
      selectedModelId: getDefaultModelId(id),
    };
  }
  return configs;
}

function loadFromStorage(): Partial<{ providers: Record<ProviderId, ProviderConfig>; activeProviderId: ProviderId }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(providers: Record<ProviderId, ProviderConfig>, activeProviderId: ProviderId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ providers, activeProviderId }));
  } catch { /* ignore */ }
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: buildDefaults(),
  activeProviderId: 'openai',
  ollamaModelStatus: 'idle',
  ollamaFirstUse: true,

  setActiveProvider: (id) => {
    if (!PROVIDER_REGISTRY[id]) return;
    set({ activeProviderId: id });
    saveToStorage(get().providers, id);
  },

  setSelectedModel: (providerId, modelId) => {
    if (!PROVIDER_REGISTRY[providerId] || !modelId) return;
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], selectedModelId: modelId },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setAuth: (providerId, auth) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], auth },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  clearAuth: (providerId) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: {
          ...state.providers[providerId],
          auth: { type: 'none' },
          dynamicModels: [],
        },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setDynamicModels: (providerId, models) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], dynamicModels: models },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setBaseUrl: (providerId, baseUrl) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], baseUrl },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setApiPath: (providerId, apiPath) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], apiPath },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setNoModelApi: (providerId, value) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: { ...state.providers[providerId], noModelApi: value },
      },
    }));
    saveToStorage(get().providers, get().activeProviderId);
  },

  setOllamaStatus: (status) => {
    set({ ollamaModelStatus: status });
  },

  setOllamaFirstUse: (isFirstUse) => {
    set({ ollamaFirstUse: isFirstUse });
  },

  isConnected: (providerId) => {
    return get().providers[providerId]?.auth.type !== 'none';
  },

  getActiveConfig: () => {
    const state = get();
    return state.providers[state.activeProviderId];
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    console.log('[Provider Store] Hydrating from localStorage...');
    const saved = loadFromStorage();

    if (saved.providers || saved.activeProviderId) {
      console.log('[Provider Store] Found saved config:', {
        activeProvider: saved.activeProviderId,
        providers: Object.keys(saved.providers || {})
      });

      const defaults = buildDefaults();
      const merged = { ...defaults };
      if (saved.providers) {
        for (const id of PROVIDER_IDS) {
          if (saved.providers[id]) {
            merged[id] = { ...defaults[id], ...saved.providers[id] };
          }
        }
      }
      set({
        providers: merged,
        activeProviderId: saved.activeProviderId ?? 'openai',
      });

      console.log('[Provider Store] Hydration complete. Active provider:', saved.activeProviderId ?? 'openai');
    } else {
      console.log('[Provider Store] No saved config found, using defaults');
    }
  },
}));
