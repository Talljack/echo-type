import { describe, expect, it } from 'vitest';

describe('desktop settings storage', () => {
  it('restores every persisted setting into the current webview storage', async () => {
    const values = new Map<string, string>([['echotype_theme', 'dark']]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    };
    const module = (await import('./desktop-settings-storage')) as typeof import('./desktop-settings-storage');

    module.restoreSettingsSnapshot(storage, {
      echotype_theme: 'light',
      echotype_tts_settings: '{"rate":1.2}',
    });

    expect([...values.entries()]).toEqual([
      ['echotype_theme', 'light'],
      ['echotype_tts_settings', '{"rate":1.2}'],
    ]);
  });
});
