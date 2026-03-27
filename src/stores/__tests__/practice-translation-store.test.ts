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

const { usePracticeTranslationStore } = await import('@/stores/practice-translation-store');

describe('practice-translation-store', () => {
  beforeEach(() => {
    storage.clear();
    usePracticeTranslationStore.getState().resetForTests();
  });

  it('defaults visibility by module spec', () => {
    const state = usePracticeTranslationStore.getState();

    expect(state.isVisible('listen')).toBe(true);
    expect(state.isVisible('read')).toBe(true);
    expect(state.isVisible('speak')).toBe(false);
    expect(state.isVisible('write')).toBe(false);
  });

  it('toggling one module does not mutate others', () => {
    const store = usePracticeTranslationStore.getState();

    store.toggle('speak');

    expect(store.isVisible('speak')).toBe(true);
    expect(store.isVisible('listen')).toBe(true);
    expect(store.isVisible('read')).toBe(true);
    expect(store.isVisible('write')).toBe(false);
  });

  it('hydrates persisted module visibility from localStorage', () => {
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

    usePracticeTranslationStore.getState().hydrate();

    const state = usePracticeTranslationStore.getState();
    expect(state.isVisible('listen')).toBe(false);
    expect(state.isVisible('read')).toBe(true);
    expect(state.isVisible('speak')).toBe(true);
    expect(state.isVisible('write')).toBe(false);
  });
});
