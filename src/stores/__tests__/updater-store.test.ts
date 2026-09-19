import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  getVersion: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({ IS_TAURI: true }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: mocks.getVersion }));

describe('updater store', () => {
  afterEach(() => {
    mocks.check.mockReset();
    mocks.getVersion.mockReset();
    vi.resetModules();
  });

  it('waits for an in-flight check instead of dropping a menu-triggered request', async () => {
    let resolveCheck: ((value: null) => void) | undefined;
    mocks.getVersion.mockResolvedValue('1.5.0');
    mocks.check.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolveCheck = resolve;
        }),
    );

    const { useUpdaterStore } = await import('@/stores/updater-store');
    const automaticCheck = useUpdaterStore.getState().checkForUpdate();
    const menuCheck = useUpdaterStore.getState().checkForUpdate();
    let menuFinished = false;
    void menuCheck.then(() => {
      menuFinished = true;
    });

    await vi.waitFor(() => expect(mocks.check).toHaveBeenCalledTimes(1));
    expect(menuFinished).toBe(false);

    resolveCheck?.(null);
    await Promise.all([automaticCheck, menuCheck]);
    expect(useUpdaterStore.getState().status).toBe('up-to-date');
  });
});
