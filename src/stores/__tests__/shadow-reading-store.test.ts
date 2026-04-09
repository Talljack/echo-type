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

const { useShadowReadingStore } = await import('@/stores/shadow-reading-store');

describe('shadow-reading-store', () => {
  beforeEach(() => {
    storage.clear();
    useShadowReadingStore.getState().resetForTests();
  });

  it('starts disabled with no session', () => {
    const state = useShadowReadingStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.session).toBeNull();
    expect(state.showCompletionModal).toBe(false);
  });

  it('enables and disables', () => {
    useShadowReadingStore.getState().setEnabled(true);
    expect(useShadowReadingStore.getState().enabled).toBe(true);

    useShadowReadingStore.getState().setEnabled(false);
    expect(useShadowReadingStore.getState().enabled).toBe(false);
  });

  it('clears session when disabled', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test Content');
    expect(useShadowReadingStore.getState().session).not.toBeNull();

    store.setEnabled(false);
    expect(useShadowReadingStore.getState().session).toBeNull();
  });

  it('starts a session with all modules pending', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'My Article');

    const session = useShadowReadingStore.getState().session;
    expect(session).not.toBeNull();
    expect(session!.contentId).toBe('content-1');
    expect(session!.contentTitle).toBe('My Article');
    expect(session!.moduleProgress.listen).toBe('pending');
    expect(session!.moduleProgress.read).toBe('pending');
    expect(session!.moduleProgress.write).toBe('pending');
    expect(session!.completedAt).toBeNull();
  });

  it('marks module progress', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    store.markModuleProgress('listen', 'in_progress');
    expect(useShadowReadingStore.getState().session!.moduleProgress.listen).toBe('in_progress');

    store.markModuleProgress('listen', 'completed');
    expect(useShadowReadingStore.getState().session!.moduleProgress.listen).toBe('completed');
  });

  it('shows completion modal when all modules completed', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    store.markModuleProgress('listen', 'completed');
    expect(useShadowReadingStore.getState().showCompletionModal).toBe(false);

    store.markModuleProgress('read', 'completed');
    expect(useShadowReadingStore.getState().showCompletionModal).toBe(false);

    store.markModuleProgress('write', 'completed');
    expect(useShadowReadingStore.getState().showCompletionModal).toBe(true);
    expect(useShadowReadingStore.getState().session!.completedAt).not.toBeNull();
  });

  it('dismisses completion and clears session', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');
    store.markModuleProgress('listen', 'completed');
    store.markModuleProgress('read', 'completed');
    store.markModuleProgress('write', 'completed');

    expect(useShadowReadingStore.getState().showCompletionModal).toBe(true);

    store.dismissCompletion();
    expect(useShadowReadingStore.getState().showCompletionModal).toBe(false);
    expect(useShadowReadingStore.getState().session).toBeNull();
  });

  it('persists to localStorage', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Persisted');

    const saved = JSON.parse(storage.get('echotype_shadow_reading') ?? '{}');
    expect(saved.enabled).toBe(true);
    expect(saved.session.contentId).toBe('content-1');
  });

  it('hydrates from localStorage', () => {
    storage.set(
      'echotype_shadow_reading',
      JSON.stringify({
        enabled: true,
        session: {
          contentId: 'hydrated-1',
          contentTitle: 'Hydrated',
          moduleProgress: { listen: 'completed', read: 'in_progress', write: 'pending' },
          startedAt: 1000,
          completedAt: null,
        },
      }),
    );

    useShadowReadingStore.getState().hydrate();

    const state = useShadowReadingStore.getState();
    expect(state.enabled).toBe(true);
    expect(state.session!.contentId).toBe('hydrated-1');
    expect(state.session!.moduleProgress.listen).toBe('completed');
    expect(state.session!.moduleProgress.read).toBe('in_progress');
    expect(state.session!.moduleProgress.write).toBe('pending');
  });

  it('returns correct completed count', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    expect(store.getCompletedCount()).toBe(0);

    store.markModuleProgress('listen', 'completed');
    expect(useShadowReadingStore.getState().getCompletedCount()).toBe(1);

    store.markModuleProgress('read', 'completed');
    expect(useShadowReadingStore.getState().getCompletedCount()).toBe(2);
  });

  it('returns next incomplete module in order', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    expect(store.getNextIncompleteModule()).toBe('listen');

    store.markModuleProgress('listen', 'completed');
    expect(useShadowReadingStore.getState().getNextIncompleteModule()).toBe('read');

    store.markModuleProgress('read', 'completed');
    expect(useShadowReadingStore.getState().getNextIncompleteModule()).toBe('write');

    store.markModuleProgress('write', 'completed');
    expect(useShadowReadingStore.getState().getNextIncompleteModule()).toBeNull();
  });

  it('checks session for content correctly', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    expect(useShadowReadingStore.getState().isSessionForContent('content-1')).toBe(true);
    expect(useShadowReadingStore.getState().isSessionForContent('content-2')).toBe(false);
  });

  it('does not mark progress without a session', () => {
    const store = useShadowReadingStore.getState();
    store.markModuleProgress('listen', 'completed');
    expect(useShadowReadingStore.getState().session).toBeNull();
  });

  it('clears session explicitly', () => {
    const store = useShadowReadingStore.getState();
    store.setEnabled(true);
    store.startSession('content-1', 'Test');

    store.clearSession();
    expect(useShadowReadingStore.getState().session).toBeNull();

    const saved = JSON.parse(storage.get('echotype_shadow_reading') ?? '{}');
    expect(saved.session).toBeNull();
  });

  it('handles hydration from empty localStorage gracefully', () => {
    useShadowReadingStore.getState().hydrate();
    const state = useShadowReadingStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.session).toBeNull();
  });

  it('handles hydration from invalid JSON gracefully', () => {
    storage.set('echotype_shadow_reading', 'not-json');
    useShadowReadingStore.getState().hydrate();
    const state = useShadowReadingStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.session).toBeNull();
  });
});
