import { create } from 'zustand';

import { PRACTICE_TRANSLATION_POLICY, type PracticeModule } from '@/types/translation';

const STORAGE_KEY = 'echotype_practice_translation';

type VisibilityState = Record<PracticeModule, boolean>;

type PersistedPracticeTranslationState = {
  visibility?: Partial<VisibilityState>;
};

interface PracticeTranslationStore {
  visibility: VisibilityState;
  hydrate: () => void;
  isVisible: (module: PracticeModule) => boolean;
  setVisible: (module: PracticeModule, visible: boolean) => void;
  toggle: (module: PracticeModule) => void;
  resetToDefaults: () => void;
  resetForTests: () => void;
}

function getDefaultVisibility(): VisibilityState {
  return {
    listen: PRACTICE_TRANSLATION_POLICY.listen.defaultVisible,
    read: PRACTICE_TRANSLATION_POLICY.read.defaultVisible,
    speak: PRACTICE_TRANSLATION_POLICY.speak.defaultVisible,
    write: PRACTICE_TRANSLATION_POLICY.write.defaultVisible,
  };
}

function parseStoredJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadFromStorage(): PersistedPracticeTranslationState | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredJson<PersistedPracticeTranslationState>(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveToStorage(visibility: VisibilityState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility }));
  } catch {
    /* ignore */
  }
}

function resolveInitialVisibility(): VisibilityState {
  const saved = loadFromStorage();
  if (saved?.visibility) {
    return mergeVisibility(saved.visibility);
  }
  return getDefaultVisibility();
}

function mergeVisibility(savedVisibility?: Partial<VisibilityState>): VisibilityState {
  return {
    ...getDefaultVisibility(),
    ...(savedVisibility ?? {}),
  };
}

export const usePracticeTranslationStore = create<PracticeTranslationStore>((set, get) => {
  const defaults = resolveInitialVisibility();

  return {
    visibility: defaults,

    hydrate: () => {
      const saved = loadFromStorage();
      if (saved?.visibility) {
        set({ visibility: mergeVisibility(saved.visibility) });
        return;
      }
      set({ visibility: getDefaultVisibility() });
    },

    isVisible: (module) => get().visibility[module],

    setVisible: (module, visible) => {
      const visibility = {
        ...get().visibility,
        [module]: visible,
      };
      set({ visibility });
      saveToStorage(visibility);
    },

    toggle: (module) => {
      if (!PRACTICE_TRANSLATION_POLICY[module].allowToggle) return;
      const visibility = {
        ...get().visibility,
        [module]: !get().visibility[module],
      };
      set({ visibility });
      saveToStorage(visibility);
    },

    resetToDefaults: () => {
      const visibility = getDefaultVisibility();
      set({ visibility });
      saveToStorage(visibility);
    },

    resetForTests: () => {
      const visibility = getDefaultVisibility();
      set({ visibility });
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    },
  };
});
