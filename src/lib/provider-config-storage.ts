import { IS_TAURI } from './tauri';

/**
 * Reads the desktop copy of the provider configuration. Tauri stores this in
 * its app data directory, which is independent from the sidecar's localhost
 * port and therefore survives application updates.
 */
export async function readDesktopProviderConfig(): Promise<string | null> {
  if (!IS_TAURI) return null;

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('read_provider_config');
}

/** Writes a complete provider configuration snapshot to the native app-data file. */
export async function writeDesktopProviderConfig(config: string): Promise<void> {
  if (!IS_TAURI) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('write_provider_config', { config });
}
