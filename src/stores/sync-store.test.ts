import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const account=vi.hoisted(()=>({name:'echotype:anonymous'}));
vi.mock('@/lib/db',()=>({db:{get name(){return account.name;}}}));

describe('sync-store', () => {
  beforeEach(() => {
    storage.clear();
    account.name='echotype:anonymous';
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
      // An anonymous session must never inherit another account's global legacy timestamp.
      lastSyncedAt: null,
    });
    expect(startAutoSync).toHaveBeenCalledOnce();
  });
  it('hydrates only the active account checkpoint, including after an account switch',async()=>{
    storage.set('echotype_sync_settings',JSON.stringify({isSyncEnabled:true,lastSyncedAt:'legacy-other-account'}));
    storage.set('echotype_last_synced_alice','2026-08-01T00:00:00.000Z');
    storage.set('echotype_last_synced_bob','2026-09-01T00:00:00.000Z');
    const {useSyncStore}=await import('./sync-store');const startAutoSync=vi.fn();useSyncStore.setState({startAutoSync});
    account.name='echotype:user:alice';useSyncStore.getState().hydrate();expect(useSyncStore.getState().lastSyncedAt).toBe('2026-08-01T00:00:00.000Z');
    account.name='echotype:user:bob';useSyncStore.getState().hydrate();expect(useSyncStore.getState().lastSyncedAt).toBe('2026-09-01T00:00:00.000Z');
    account.name='echotype:anonymous';useSyncStore.getState().hydrate();expect(useSyncStore.getState().lastSyncedAt).toBeNull();
    expect(useSyncStore.getState().isSyncEnabled).toBe(true);expect(startAutoSync).toHaveBeenCalledTimes(3);
  });
});
