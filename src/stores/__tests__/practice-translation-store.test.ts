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

async function loadStore() {
  vi.resetModules();
  return await import('@/stores/practice-translation-store');
}

describe('practice-translation-store', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('defaults visibility by module spec', async () => {
    const { usePracticeTranslationStore } = await loadStore();

    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('read')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('write')).toBe(false);
  });

  it('initializes from persisted visibility without waiting for hydrate', async () => {
    storage.set(
      'echotype_practice_translation',
      JSON.stringify({
        visibility: {
          listen: false,
          read: false,
          speak: true,
          write: true,
        },
      }),
    );

    const { usePracticeTranslationStore } = await loadStore();

    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('read')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('write')).toBe(true);

    usePracticeTranslationStore.getState().hydrate();

    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('read')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('write')).toBe(true);
  });

  it('migrates legacy showTranslation preference into module-scoped visibility', async () => {
    storage.set(
      'echotype_tts_settings',
      JSON.stringify({
        voiceSource: 'browser',
        showTranslation: false,
      }),
    );

    const { usePracticeTranslationStore } = await loadStore();

    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('read')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('write')).toBe(false);

    expect(JSON.parse(storage.get('echotype_practice_translation') ?? '{}')).toEqual({
      visibility: {
        listen: false,
        read: false,
        speak: false,
        write: false,
      },
    });
  });

  it('boots safely when localStorage access throws during import', async () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('storage blocked');
      },
      setItem: () => {
        throw new Error('storage blocked');
      },
      removeItem: () => {
        throw new Error('storage blocked');
      },
      clear: () => {
        throw new Error('storage blocked');
      },
      get length() {
        throw new Error('storage blocked');
      },
      key: () => {
        throw new Error('storage blocked');
      },
    } as unknown as Storage;

    vi.stubGlobal('localStorage', throwingStorage);

    const { usePracticeTranslationStore } = await loadStore();

    expect(usePracticeTranslationStore.getState().isVisible('listen')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('read')).toBe(true);
    expect(usePracticeTranslationStore.getState().isVisible('speak')).toBe(false);
    expect(usePracticeTranslationStore.getState().isVisible('write')).toBe(false);

    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('toggling one module does not mutate others', async () => {
    const { usePracticeTranslationStore } = await loadStore();
    const store = usePracticeTranslationStore.getState();

    store.toggle('speak');

    expect(store.isVisible('speak')).toBe(true);
    expect(store.isVisible('listen')).toBe(true);
    expect(store.isVisible('read')).toBe(true);
    expect(store.isVisible('write')).toBe(false);
  });

  it('hydrates persisted module visibility from localStorage', async () => {
    storage.set(
      'echotype_practice_translation',
      JSON.stringify({
        visibility: {
          listen: false,
          read: true,
          speak: true,
          write: false,
        },
      }),
    );

    const { usePracticeTranslationStore } = await loadStore();

    usePracticeTranslationStore.getState().hydrate();

    const state = usePracticeTranslationStore.getState();
    expect(state.isVisible('listen')).toBe(false);
    expect(state.isVisible('read')).toBe(true);
    expect(state.isVisible('speak')).toBe(true);
    expect(state.isVisible('write')).toBe(false);
  });
});
