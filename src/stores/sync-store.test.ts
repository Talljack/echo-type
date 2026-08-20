import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

describe('sync-store', () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores automatic sync when it was enabled before the app restarted', async () => {
    storage.set('echotype_sync_settings', JSON.stringify({ isSyncEnabled: true, lastSyncedAt: '2026-08-01T00:00:00.000Z' }));
    const { useSyncStore } = await import('./sync-store');
    const startAutoSync = vi.fn();
    useSyncStore.setState({ startAutoSync });

    useSyncStore.getState().hydrate();

    expect(useSyncStore.getState()).toMatchObject({
      isSyncEnabled: true,
      lastSyncedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(startAutoSync).toHaveBeenCalledOnce();
  });
});
