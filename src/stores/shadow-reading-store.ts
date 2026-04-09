import { create } from 'zustand';

const STORAGE_KEY = 'echotype_shadow_reading';

export type ShadowModule = 'listen' | 'read' | 'write';
export type ModuleStatus = 'pending' | 'in_progress' | 'completed';

export const SHADOW_MODULES: ShadowModule[] = ['listen', 'read', 'write'];

export interface ShadowReadingSession {
  contentId: string;
  contentTitle: string;
  moduleProgress: Record<ShadowModule, ModuleStatus>;
  startedAt: number;
  completedAt: number | null;
}

interface PersistedState {
  enabled: boolean;
  session: ShadowReadingSession | null;
}

export interface PendingSessionSwitch {
  contentId: string;
  contentTitle: string;
}

interface ShadowReadingStore {
  enabled: boolean;
  session: ShadowReadingSession | null;
  showCompletionModal: boolean;
  showEndConfirm: boolean;
  pendingSwitch: PendingSessionSwitch | null;
  setEnabled: (v: boolean) => void;
  startSession: (contentId: string, title: string) => void;
  startOrSwitchSession: (contentId: string, title: string) => void;
  confirmSwitch: () => void;
  cancelSwitch: () => void;
  markModuleProgress: (module: ShadowModule, status: ModuleStatus) => void;
  clearSession: () => void;
  dismissCompletion: () => void;
  requestEndSession: () => void;
  cancelEndSession: () => void;
  hydrate: () => void;
  getCompletedCount: () => number;
  getNextIncompleteModule: () => ShadowModule | null;
  isSessionForContent: (contentId: string) => boolean;
  resetForTests: () => void;
}

function loadFromStorage(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function saveToStorage(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function getDefaultModuleProgress(): Record<ShadowModule, ModuleStatus> {
  return { listen: 'pending', read: 'pending', write: 'pending' };
}

function countCompleted(progress: Record<ShadowModule, ModuleStatus>): number {
  return SHADOW_MODULES.filter((m) => progress[m] === 'completed').length;
}

function findNextIncomplete(progress: Record<ShadowModule, ModuleStatus>): ShadowModule | null {
  return SHADOW_MODULES.find((m) => progress[m] !== 'completed') ?? null;
}

export const useShadowReadingStore = create<ShadowReadingStore>((set, get) => ({
  enabled: false,
  session: null,
  showCompletionModal: false,
  showEndConfirm: false,
  pendingSwitch: null,

  setEnabled: (enabled) => {
    set({ enabled });
    if (!enabled) {
      set({ session: null, showCompletionModal: false });
    }
    saveToStorage({ enabled, session: enabled ? get().session : null });
  },

  startSession: (contentId, contentTitle) => {
    const session: ShadowReadingSession = {
      contentId,
      contentTitle,
      moduleProgress: getDefaultModuleProgress(),
      startedAt: Date.now(),
      completedAt: null,
    };
    set({ session, showCompletionModal: false, pendingSwitch: null });
    saveToStorage({ enabled: get().enabled, session });
  },

  startOrSwitchSession: (contentId, contentTitle) => {
    const { session } = get();
    if (session && session.contentId !== contentId && countCompleted(session.moduleProgress) > 0) {
      set({ pendingSwitch: { contentId, contentTitle } });
      return;
    }
    get().startSession(contentId, contentTitle);
  },

  confirmSwitch: () => {
    const { pendingSwitch } = get();
    if (pendingSwitch) {
      get().startSession(pendingSwitch.contentId, pendingSwitch.contentTitle);
    }
  },

  cancelSwitch: () => {
    set({ pendingSwitch: null });
  },

  markModuleProgress: (module, status) => {
    const { session, enabled } = get();
    if (!session) return;

    const moduleProgress = { ...session.moduleProgress, [module]: status };
    const allDone = countCompleted(moduleProgress) === SHADOW_MODULES.length;
    const completedAt = allDone ? Date.now() : session.completedAt;
    const updatedSession = { ...session, moduleProgress, completedAt };

    set({
      session: updatedSession,
      showCompletionModal: allDone,
    });
    saveToStorage({ enabled, session: updatedSession });
  },

  clearSession: () => {
    set({ session: null, showCompletionModal: false, showEndConfirm: false });
    saveToStorage({ enabled: get().enabled, session: null });
  },

  dismissCompletion: () => {
    set({ showCompletionModal: false, session: null });
    saveToStorage({ enabled: get().enabled, session: null });
  },

  requestEndSession: () => {
    if (get().session) set({ showEndConfirm: true });
  },

  cancelEndSession: () => {
    set({ showEndConfirm: false });
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (!saved) return;
    set({ enabled: saved.enabled, session: saved.session });
  },

  getCompletedCount: () => {
    const { session } = get();
    if (!session) return 0;
    return countCompleted(session.moduleProgress);
  },

  getNextIncompleteModule: () => {
    const { session } = get();
    if (!session) return null;
    return findNextIncomplete(session.moduleProgress);
  },

  isSessionForContent: (contentId) => {
    const { session, enabled } = get();
    return enabled && session?.contentId === contentId;
  },

  resetForTests: () => {
    set({ enabled: false, session: null, showCompletionModal: false, showEndConfirm: false, pendingSwitch: null });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  },
}));
