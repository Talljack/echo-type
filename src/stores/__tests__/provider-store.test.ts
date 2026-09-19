import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index) => [...storage.keys()][index] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', globalThis);

const { encrypt } = await import('@/lib/storage-crypto');
const { useProviderStore } = await import('@/stores/provider-store');
const defaultProviders = structuredClone(useProviderStore.getState().providers);

describe('provider store hydration', () => {
  beforeEach(() => {
    storage.clear();
    useProviderStore.setState({
      providers: structuredClone(defaultProviders),
      activeProviderId: 'groq',
      globalMaxTokens: 4096,
      hydrated: false,
    });
  });

  it('reports hydration complete after restoring a configured provider', async () => {
    const providers = structuredClone(defaultProviders);
    providers.ollama.auth = { type: 'api-key', apiKey: 'ollama' };
    providers.ollama.selectedModelId = 'glm-5.1:cloud';
    localStorage.setItem(
      'echotype_provider_config',
      await encrypt(JSON.stringify({ providers, activeProviderId: 'ollama', globalMaxTokens: 4096 })),
    );

    await useProviderStore.getState().hydrate();

    const state = useProviderStore.getState() as ReturnType<typeof useProviderStore.getState> & {
      hydrated?: boolean;
    };
    expect(state.hydrated).toBe(true);
    expect(state.activeProviderId).toBe('ollama');
    expect(state.hasAnyProviderConfigured()).toBe(true);
  });

  it('does not rehydrate over live provider state after startup', async () => {
    const persistedProviders = structuredClone(defaultProviders);
    persistedProviders.ollama.auth = { type: 'api-key', apiKey: 'ollama' };
    localStorage.setItem(
      'echotype_provider_config',
      await encrypt(
        JSON.stringify({ providers: persistedProviders, activeProviderId: 'ollama', globalMaxTokens: 4096 }),
      ),
    );
    useProviderStore.setState({ activeProviderId: 'groq', hydrated: true });

    await useProviderStore.getState().hydrate();

    expect(useProviderStore.getState().activeProviderId).toBe('groq');
  });
});
