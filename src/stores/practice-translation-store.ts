import { create } from 'zustand';

import { PRACTICE_TRANSLATION_POLICY, type PracticeModule } from '@/types/translation';

const STORAGE_KEY = 'echotype_practice_translation';

type VisibilityState = Record<PracticeModule, boolean>;

interface PracticeTranslationStore {
  visibility: VisibilityState;
  hydrate: () => void;
  isVisible: (module: PracticeModule) => boolean;
  setVisible: (module: PracticeModule, visible: boolean) => void;
  toggle: (module: PracticeModule) => void;
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

function loadFromStorage(): Partial<{ visibility: Partial<VisibilityState> }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(visibility: VisibilityState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility }));
  } catch {
    /* ignore */
  }
}

function mergeVisibility(savedVisibility?: Partial<VisibilityState>): VisibilityState {
  return {
    ...getDefaultVisibility(),
    ...(savedVisibility ?? {}),
  };
}

export const usePracticeTranslationStore = create<PracticeTranslationStore>((set, get) => {
  const defaults = getDefaultVisibility();

  return {
    visibility: defaults,

    hydrate: () => {
      const saved = loadFromStorage();
      if (saved.visibility) {
        set({ visibility: mergeVisibility(saved.visibility) });
      }
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
