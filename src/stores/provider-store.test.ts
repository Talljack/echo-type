import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

describe('provider-store desktop persistence', () => {
  beforeEach(() => {
    storage.clear();
    invoke.mockReset();
    vi.resetModules();
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores the desktop configuration file instead of the current webview origin', async () => {
    storage.set(
      'echotype_provider_config',
      JSON.stringify({ activeProviderId: 'groq', providers: { groq: { auth: { type: 'api-key', apiKey: 'old-key' } } } }),
    );
    invoke.mockResolvedValue(
      JSON.stringify({
        activeProviderId: 'openai',
        globalMaxTokens: 8192,
        providers: { openai: { auth: { type: 'api-key', apiKey: 'stable-key' }, selectedModelId: 'gpt-5' } },
      }),
    );

    const { useProviderStore } = await import('./provider-store');
    await useProviderStore.getState().hydrate();

    expect(invoke).toHaveBeenCalledWith('read_provider_config');
    expect(useProviderStore.getState()).toMatchObject({
      activeProviderId: 'openai',
      globalMaxTokens: 8192,
      providers: { openai: { auth: { type: 'api-key', apiKey: 'stable-key' }, selectedModelId: 'gpt-5' } },
    });
  });

  it('writes provider changes to the desktop configuration file', async () => {
    invoke.mockResolvedValue(null);
    const { useProviderStore } = await import('./provider-store');
    await useProviderStore.getState().hydrate();

    useProviderStore.getState().setAuth('openai', { type: 'api-key', apiKey: 'new-key' });

    await vi.waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'write_provider_config',
        expect.objectContaining({ config: expect.stringContaining('new-key') }),
      );
    });
  });

  it('migrates the legacy webview configuration to the desktop file', async () => {
    storage.set(
      'echotype_provider_config',
      JSON.stringify({
        activeProviderId: 'anthropic',
        providers: { anthropic: { auth: { type: 'api-key', apiKey: 'legacy-key' } } },
      }),
    );
    invoke.mockResolvedValue(null);

    const { useProviderStore } = await import('./provider-store');
    await useProviderStore.getState().hydrate();

    await vi.waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'write_provider_config',
        expect.objectContaining({ config: expect.stringContaining('legacy-key') }),
      );
    });
  });
});
