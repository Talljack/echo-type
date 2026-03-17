/**
 * Tauri environment detection utilities.
 *
 * These helpers allow the app to detect whether it's running inside
 * a Tauri webview and adapt behavior accordingly.
 */

declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
    __ECHOTYPE_PORT__?: number;
  }
}

/** Whether the app is running inside a Tauri webview */
export const IS_TAURI = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Get the base URL for API calls.
 * In Tauri production mode, API calls go to the local sidecar server.
 * In web mode, relative URLs are used.
 */
export function getApiBase(): string {
  if (IS_TAURI && window.__ECHOTYPE_PORT__) {
    return `http://localhost:${window.__ECHOTYPE_PORT__}`;
  }
  return '';
}
