import { IS_TAURI } from './tauri';

export interface SettingsStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function restoreSettingsSnapshot(storage: SettingsStorage, snapshot: Record<string, string>) {
  for (const [key, value] of Object.entries(snapshot)) storage.setItem(key, value);
}

function snapshotSettings(storage: SettingsStorage): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    const value = storage.getItem(key);
    if (value != null) snapshot[key] = value;
  }
  return snapshot;
}

let initialized = false;
let writeQueue = Promise.resolve();

export async function initializeDesktopSettingsPersistence(): Promise<void> {
  if (!IS_TAURI || initialized || typeof window === 'undefined') return;
  const { invoke } = await import('@tauri-apps/api/core');
  const storage = window.localStorage;
  const saved = await invoke<Record<string, string>>('read_settings_snapshot');
  restoreSettingsSnapshot(storage, saved);
  initialized = true;

  const persist = () => {
    const snapshot = snapshotSettings(storage);
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(() => invoke('write_settings_snapshot', { settings: snapshot }).then(() => undefined))
      .catch((error) => console.warn('[Desktop Settings] Failed to save settings', error));
  };

  const prototype = Object.getPrototypeOf(storage) as Storage;
  const originalSetItem = prototype.setItem;
  const originalRemoveItem = prototype.removeItem;
  prototype.setItem = function setItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === storage) persist();
  };
  prototype.removeItem = function removeItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this === storage) persist();
  };
}
