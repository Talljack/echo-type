type NetInfoModule = {
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  fetch: () => Promise<NetInfoState>;
};

type NetInfoState = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
  type?: string | null;
};

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>;
};

let hasWarnedAboutNetInfo = false;
let hasWarnedAboutSharing = false;

function isNetInfoModule(value: unknown): value is NetInfoModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'addEventListener' in value &&
    typeof value.addEventListener === 'function' &&
    'fetch' in value &&
    typeof value.fetch === 'function'
  );
}

function isSharingModule(value: unknown): value is SharingModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isAvailableAsync' in value &&
    typeof value.isAvailableAsync === 'function' &&
    'shareAsync' in value &&
    typeof value.shareAsync === 'function'
  );
}

function warnOnce(kind: 'netinfo' | 'sharing', error: unknown) {
  if (kind === 'netinfo') {
    if (hasWarnedAboutNetInfo) return;
    hasWarnedAboutNetInfo = true;
    console.info('NetInfo native module unavailable, falling back to online-first behavior.', error);
    return;
  }

  if (hasWarnedAboutSharing) return;
  hasWarnedAboutSharing = true;
  console.info('ExpoSharing native module unavailable, export will stay local only.', error);
}

export function getOptionalNetInfoModule(): NetInfoModule | null {
  try {
    const requiredModule = require('@react-native-community/netinfo') as { default?: unknown } | unknown;
    const candidate =
      typeof requiredModule === 'object' && requiredModule !== null && 'default' in requiredModule
        ? requiredModule.default
        : requiredModule;

    if (!isNetInfoModule(candidate)) {
      return null;
    }

    return candidate;
  } catch (error) {
    warnOnce('netinfo', error);
    return null;
  }
}

export function getOptionalSharingModule(): SharingModule | null {
  try {
    const requiredModule = require('expo-sharing') as { default?: unknown } | unknown;
    const candidate =
      typeof requiredModule === 'object' && requiredModule !== null && 'default' in requiredModule
        ? (requiredModule.default ?? requiredModule)
        : requiredModule;

    if (!isSharingModule(candidate)) {
      return null;
    }

    return candidate;
  } catch (error) {
    warnOnce('sharing', error);
    return null;
  }
}
