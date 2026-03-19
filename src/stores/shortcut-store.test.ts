import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', globalThis);

const { useShortcutStore } = await import('./shortcut-store');

describe('shortcut-store', () => {
  beforeEach(() => {
    storage.clear();
    useShortcutStore.setState({ overrides: {}, isPaused: false });
  });

  it('falls back to default shortcuts when no override exists', () => {
    expect(useShortcutStore.getState().getKey('global:open-settings')).toBe('mod+,');
    expect(useShortcutStore.getState().getKey('global:stop-tts')).toBe('mod+.');
    expect(useShortcutStore.getState().getKey('listen:speed-up')).toBe('arrowright');
    expect(useShortcutStore.getState().getKey('write:reset')).toBe('mod+alt+r');
  });

  it('persists overrides to localStorage', () => {
    useShortcutStore.getState().setOverride('global:toggle-chat', 'mod+shift+j');

    expect(useShortcutStore.getState().getKey('global:toggle-chat')).toBe('mod+shift+j');
    expect(JSON.parse(storage.get('echotype_shortcut_overrides') ?? '{}')).toEqual({
      overrides: {
        'global:toggle-chat': 'mod+shift+j',
      },
    });
  });

  it('hydrates saved overrides from localStorage', () => {
    storage.set(
      'echotype_shortcut_overrides',
      JSON.stringify({
        overrides: {
          'listen:toggle-translation': 'shift+t',
        },
      }),
    );

    useShortcutStore.getState().hydrate();

    expect(useShortcutStore.getState().getKey('listen:toggle-translation')).toBe('shift+t');
  });

  it('tracks paused state separately from persisted overrides', () => {
    const store = useShortcutStore.getState();

    store.setOverride('global:nav-listen', 'mod+l');
    store.setPaused(true);

    expect(useShortcutStore.getState().isPaused).toBe(true);
    expect(JSON.parse(storage.get('echotype_shortcut_overrides') ?? '{}')).toEqual({
      overrides: {
        'global:nav-listen': 'mod+l',
      },
    });
  });
});
