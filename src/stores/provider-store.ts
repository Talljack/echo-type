import { create } from 'zustand';
import { type ProviderCapability } from '@/lib/provider-capabilities';
import {
  getDefaultModelId,
  PROVIDER_IDS,
  PROVIDER_REGISTRY,
  type ProviderAuthState,
  type ProviderConfig,
  type ProviderId,
  type ProviderModel,
  type ProviderModelRecommendation,
} from '@/lib/providers';
import { decryptOrRaw, encrypt } from '@/lib/storage-crypto';

const STORAGE_KEY = 'echotype_provider_config';

export type OllamaStatus = 'idle' | 'preloading' | 'ready' | 'generating' | 'error';

interface ProviderStore {
  providers: Record<ProviderId, ProviderConfig>;
  activeProviderId: ProviderId;
  ollamaModelStatus: OllamaStatus;
  ollamaFirstUse: boolean;

  setActiveProvider: (id: ProviderId) => void;
  setSelectedModel: (providerId: ProviderId, modelId: string) => void;
  setModelOverride: (providerId: ProviderId, capability: ProviderCapability, modelId: string) => void;
  setAuth: (providerId: ProviderId, auth: ProviderAuthState) => void;
  clearAuth: (providerId: ProviderId) => void;
  setDynamicModels: (providerId: ProviderId, models: ProviderModel[]) => void;
  setModelRecommendations: (
    providerId: ProviderId,
    recommendations: ProviderModelRecommendation[],
    modelRecommendationKey: string,
  ) => void;
  setBaseUrl: (providerId: ProviderId, baseUrl: string) => void;
  setApiPath: (providerId: ProviderId, apiPath: string) => void;
  setNoModelApi: (providerId: ProviderId, value: boolean) => void;
  setOllamaStatus: (status: OllamaStatus) => void;
  setOllamaFirstUse: (isFirstUse: boolean) => void;
  isConnected: (providerId: ProviderId) => boolean;
  getActiveConfig: () => ProviderConfig;
  getActiveProviderOrFree: () => ProviderConfig;
  hydrate: () => Promise<void>;
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

// ─── Encrypted storage ──────────────────────────────────────────────────────

async function loadFromStorage(): Promise<
  Partial<{ providers: Record<ProviderId, ProviderConfig>; activeProviderId: ProviderId }>
> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const { data, wasEncrypted } = await decryptOrRaw(raw);
    const parsed = JSON.parse(data);

    // Migrate: re-save as encrypted if it was plain JSON
    if (!wasEncrypted && parsed) {
      const encrypted = await encrypt(data);
      localStorage.setItem(STORAGE_KEY, encrypted);
      console.log('[Provider Store] Migrated to encrypted storage');
    }

    return parsed;
  } catch {
    /* ignore corrupted data */
  }
  return {};
}

/** Hydration guard — prevents saving default (empty) state before hydration completes */
let _hydrated = false;

function saveToStorage(providers: Record<ProviderId, ProviderConfig>, activeProviderId: ProviderId) {
  if (typeof window === 'undefined') return;
  if (!_hydrated) {
    console.warn('[Provider Store] Blocked save before hydration — preventing data loss');
    return;
  }
  const json = JSON.stringify({ providers, activeProviderId });
  void encrypt(json).then((encrypted) => {
    try {
      localStorage.setItem(STORAGE_KEY, encrypted);
    } catch {
      /* storage full or unavailable */
    }
  });
}

export const useProviderStore = create<ProviderStore>((set, get) => ({
  providers: buildDefaults(),
  activeProviderId: 'groq',
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

  setModelOverride: (providerId, capability, modelId) => {
    if (!PROVIDER_REGISTRY[providerId] || !modelId) return;
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: {
          ...state.providers[providerId],
          modelOverrides: {
            ...(state.providers[providerId].modelOverrides ?? {}),
            [capability]: modelId,
          },
        },
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
          modelRecommendations: [],
          modelRecommendationKey: undefined,
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

  setModelRecommendations: (providerId, recommendations, modelRecommendationKey) => {
    set((state) => ({
      providers: {
        ...state.providers,
        [providerId]: {
          ...state.providers[providerId],
          modelRecommendations: recommendations,
          modelRecommendationKey,
        },
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

  /** Returns the active provider config, or a Groq fallback if no provider is connected */
  getActiveProviderOrFree: () => {
    const state = get();
    const active = state.providers[state.activeProviderId];
    if (active.auth.type !== 'none') return active;
    // Fallback to Groq when no provider is connected.
    return {
      providerId: 'groq' as ProviderId,
      auth: { type: 'none' as const },
      selectedModelId: 'llama-3.3-70b-versatile',
    };
  },

  hydrate: async () => {
    if (typeof window === 'undefined') return;

    console.log('[Provider Store] Hydrating from localStorage...');
    const saved = await loadFromStorage();

    if (saved.providers || saved.activeProviderId) {
      console.log('[Provider Store] Found saved config:', {
        activeProvider: saved.activeProviderId,
        providers: Object.keys(saved.providers || {}),
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
        activeProviderId: saved.activeProviderId ?? 'groq',
      });

      console.log('[Provider Store] Hydration complete. Active provider:', saved.activeProviderId ?? 'groq');
    } else {
      console.log('[Provider Store] No saved config found, using defaults');
    }

    // Enable saving AFTER hydration is done
    _hydrated = true;
  },
}));
