/**
 * Host environment detection utilities.
 *
 * These helpers allow the app to detect whether it's running inside
 * a native host webview and adapt behavior accordingly.
 */

declare global {
  interface EchoTypeNativeFilePayload {
    name: string;
    mimeType?: string;
    base64: string;
    size?: number;
    lastModified?: number;
  }

  interface Window {
    __ECHOTYPE_NATIVE_HOST__?: 'ios';
    __ECHOTYPE_IOS_BRIDGE_INSTALLED__?: boolean;
    __ECHOTYPE_LAST_QA_STATE__?: Record<string, unknown>;
    EchoTypeNative?: {
      isNativeApp: boolean;
      platform: 'ios';
      share?: (payload: { text?: string; url?: string; title?: string }) => void;
      openExternal?: (payload: { url: string }) => void;
      haptic?: (payload: { style?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' }) => void;
      pickFile?: (payload: { allowsMultiple?: boolean; allowedExtensions?: string[] }) => void;
      postMessage?: (type: string, payload?: Record<string, unknown>) => void;
    };
  }

  interface Window {
    __TAURI__?: Record<string, unknown>;
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __ECHOTYPE_PORT__?: number;
  }
}

/** Whether the app is running inside a Tauri webview */
export const IS_TAURI = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

const IOS_NATIVE_UA_TOKEN = 'EchoType-iOS/';

export function detectIOSNativeHost(): boolean {
  if (typeof window === 'undefined') return false;

  const nativeHostParam =
    typeof window.location !== 'undefined' ? new URLSearchParams(window.location.search).get('nativeHost') : null;
  const datasetNativeHost =
    typeof document !== 'undefined'
      ? document.documentElement.dataset.nativeHost || document.body?.dataset.nativeHost || null
      : null;

  return (
    nativeHostParam === 'ios' ||
    datasetNativeHost === 'ios' ||
    window.__ECHOTYPE_NATIVE_HOST__ === 'ios' ||
    window.EchoTypeNative?.platform === 'ios' ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes(IOS_NATIVE_UA_TOKEN))
  );
}

/** Whether the app is running inside the Swift iOS host */
export const IS_IOS_NATIVE_HOST = detectIOSNativeHost();

/** Whether the app is running inside any native host */
export const IS_NATIVE_HOST = IS_TAURI || IS_IOS_NATIVE_HOST;
export const IOS_NATIVE_AUTH_CALLBACK_URL = 'echotype://auth-callback';

export function getNativeChatToolSuite(isIOSNativeHost: boolean): 'mobile' | undefined {
  return isIOSNativeHost ? 'mobile' : undefined;
}

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

export function nativeShare(payload: { text?: string; url?: string; title?: string }): boolean {
  if (!IS_IOS_NATIVE_HOST || !window.EchoTypeNative?.share) return false;
  window.EchoTypeNative.share(payload);
  return true;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function nativeShareFile(blob: Blob, filename: string): Promise<boolean> {
  if (!IS_IOS_NATIVE_HOST || !window.EchoTypeNative?.postMessage) return false;
  const base64 = await blobToBase64(blob);
  window.EchoTypeNative.postMessage('shareFile', {
    filename,
    mimeType: blob.type || 'application/octet-stream',
    base64,
  });
  return true;
}

export function nativeHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): boolean {
  if (!IS_IOS_NATIVE_HOST || !window.EchoTypeNative?.haptic) return false;
  window.EchoTypeNative.haptic({ style });
  return true;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function createFileFromNativePayload(payload: EchoTypeNativeFilePayload): File {
  const bytes = base64ToUint8Array(payload.base64);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], payload.name, {
    type: payload.mimeType || 'application/octet-stream',
    lastModified: payload.lastModified ?? Date.now(),
  });
}

function normalizeAcceptedExtensions(accept?: string): string[] {
  if (!accept) return [];
  return accept
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.startsWith('.'))
    .map((value) => value.slice(1).toLowerCase());
}

export async function pickNativeFiles(options: { accept?: string; multiple?: boolean } = {}): Promise<File[] | null> {
  const postMessage = window.EchoTypeNative?.postMessage;
  if (!IS_IOS_NATIVE_HOST || !postMessage) return null;

  return new Promise<File[] | null>((resolve) => {
    const handlePicked = (event: Event) => {
      cleanup();
      const detail = (event as CustomEvent<{ files?: EchoTypeNativeFilePayload[] }>).detail;
      const files = (detail?.files ?? []).map(createFileFromNativePayload);
      resolve(files);
    };

    const handleCancelled = () => {
      cleanup();
      resolve(null);
    };

    const cleanup = () => {
      window.removeEventListener('echotype:native-file-picked', handlePicked as EventListener);
      window.removeEventListener('echotype:native-file-cancelled', handleCancelled);
    };

    window.addEventListener('echotype:native-file-picked', handlePicked as EventListener, { once: true });
    window.addEventListener('echotype:native-file-cancelled', handleCancelled, { once: true });

    postMessage('pickFile', {
      allowsMultiple: options.multiple ?? false,
      allowedExtensions: normalizeAcceptedExtensions(options.accept),
    });
  });
}

function serializeNativeQAState(payload: Record<string, unknown>): string {
  return Object.entries(payload)
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .join(';');
}

export function reportNativeQAState(payload: Record<string, unknown>): boolean {
  if (typeof window === 'undefined') return false;

  const serialized = serializeNativeQAState(payload);
  window.__ECHOTYPE_LAST_QA_STATE__ = payload;
  document.documentElement.dataset.nativeQaState = serialized;
  window.dispatchEvent(new CustomEvent('echotype:qa-state-changed', { detail: payload }));

  if (!detectIOSNativeHost()) return false;

  let delivered = false;
  let retryTimers: number[] = [];
  const postMessage = () => {
    if (delivered || !window.EchoTypeNative?.postMessage) return false;
    window.EchoTypeNative.postMessage('qaState', payload);
    delivered = true;
    cleanup();
    return true;
  };
  const handleNativeReady = () => {
    postMessage();
  };
  const cleanup = () => {
    window.removeEventListener('echotype:native-ready', handleNativeReady);
    retryTimers.forEach((timer) => window.clearTimeout(timer));
    retryTimers = [];
  };

  if (postMessage()) return true;

  window.addEventListener('echotype:native-ready', handleNativeReady, { once: true });
  retryTimers = [100, 300, 800].map((delay) => window.setTimeout(postMessage, delay));
  return false;
}
