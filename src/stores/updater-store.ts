import { create } from 'zustand';
import { IS_TAURI } from '@/lib/tauri';
import { downloadAndInstallUpdate } from '@/lib/updater-download';

export type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdaterState {
  status: UpdateStatus;
  currentVersion: string;
  newVersion: string;
  changelog: string;
  downloadProgress: number;
  error: string;
  dialogOpen: boolean;
}

interface UpdaterActions {
  checkForUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  openDialog: () => void;
  closeDialog: () => void;
  startPeriodicCheck: () => void;
  stopPeriodicCheck: () => void;
}

type UpdaterStore = UpdaterState & UpdaterActions;

// Hold the Update object at module level (not serializable for Zustand)
// biome-ignore lint/suspicious/noExplicitAny: Tauri Update type from dynamic import is not statically available
let pendingUpdate: any = null;
let periodicCheckInterval: ReturnType<typeof setInterval> | null = null;
let inFlightUpdateCheck: Promise<void> | null = null;

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  status: 'idle',
  currentVersion: '',
  newVersion: '',
  changelog: '',
  downloadProgress: 0,
  error: '',
  dialogOpen: false,

  checkForUpdate: () => {
    if (!IS_TAURI || get().status === 'downloading') return Promise.resolve();
    if (inFlightUpdateCheck) return inFlightUpdateCheck;

    inFlightUpdateCheck = (async () => {
      set({ status: 'checking', error: '' });

      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { getVersion } = await import('@tauri-apps/api/app');

        const currentVersion = await getVersion();
        const update = await check();

        if (update) {
          pendingUpdate = update;
          set({
            status: 'available',
            currentVersion,
            newVersion: update.version,
            changelog: update.body || '',
          });
        } else {
          set({ status: 'up-to-date', currentVersion });
        }
      } catch (err) {
        console.error('Update check failed:', err);
        set({ status: 'error', error: String(err) });
      }
    })().finally(() => {
      inFlightUpdateCheck = null;
    });

    return inFlightUpdateCheck;
  },

  downloadUpdate: async () => {
    if (!pendingUpdate) return;

    try {
      await downloadAndInstallUpdate(pendingUpdate, set);
    } catch (err) {
      console.error('Download failed:', err);
      set({ status: 'error', error: String(err) });
    }
  },

  installUpdate: async () => {
    if (!IS_TAURI) return;
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('Install/relaunch failed:', err);
      set({ status: 'error', error: String(err) });
    }
  },

  dismissUpdate: () => {
    set({ status: 'idle', dialogOpen: false, downloadProgress: 0 });
  },

  openDialog: () => {
    set({ dialogOpen: true });
  },

  closeDialog: () => {
    set({ dialogOpen: false });
  },

  startPeriodicCheck: () => {
    if (periodicCheckInterval) return;
    periodicCheckInterval = setInterval(() => {
      void get().checkForUpdate();
    }, CHECK_INTERVAL_MS);
  },

  stopPeriodicCheck: () => {
    if (periodicCheckInterval) {
      clearInterval(periodicCheckInterval);
      periodicCheckInterval = null;
    }
  },
}));
