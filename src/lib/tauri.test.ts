import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('tauri host detection', () => {
  it('uses relative API URLs outside the desktop app', async () => {
    const { IS_TAURI, getApiBase } = await import('./tauri');
    expect(IS_TAURI).toBe(false);
    expect(getApiBase()).toBe('');
  });

  it('targets the local sidecar inside the Tauri webview', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {}, __ECHOTYPE_PORT__: 4123 });
    const { IS_TAURI, getApiBase } = await import('./tauri');
    expect(IS_TAURI).toBe(true);
    expect(getApiBase()).toBe('http://127.0.0.1:4123');
  });
});
