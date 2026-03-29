import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectInterfaceLanguage, useLanguageStore } from './language-store';

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

describe('language-store', () => {
  beforeEach(() => {
    storage.clear();
    useLanguageStore.setState({
      interfaceLanguage: 'en',
      hasExplicitPreference: false,
      initialized: false,
    });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: 'en-US' },
    });
  });

  it('detects zh browser locales', () => {
    expect(detectInterfaceLanguage('zh-CN')).toBe('zh');
    expect(detectInterfaceLanguage('zh-TW')).toBe('zh');
  });

  it('defaults to english when browser locale is missing', () => {
    expect(detectInterfaceLanguage()).toBe('en');
    expect(detectInterfaceLanguage(null)).toBe('en');
  });

  it('initializes from browser language when no explicit preference exists', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: 'zh-CN' },
    });

    useLanguageStore.getState().initialize();

    expect(useLanguageStore.getState()).toMatchObject({
      interfaceLanguage: 'zh',
      hasExplicitPreference: false,
      initialized: true,
    });
  });

  it('persists explicit user choice', () => {
    useLanguageStore.getState().setInterfaceLanguage('zh');

    expect(useLanguageStore.getState()).toMatchObject({
      interfaceLanguage: 'zh',
      hasExplicitPreference: true,
      initialized: true,
    });
    expect(JSON.parse(storage.get('echotype_language_settings') ?? '{}')).toEqual({
      interfaceLanguage: 'zh',
      hasExplicitPreference: true,
    });
  });

  it('uses explicit stored preference instead of browser detection', () => {
    storage.set(
      'echotype_language_settings',
      JSON.stringify({
        interfaceLanguage: 'en',
        hasExplicitPreference: true,
      }),
    );
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: 'zh-CN' },
    });

    useLanguageStore.getState().initialize();

    expect(useLanguageStore.getState()).toMatchObject({
      interfaceLanguage: 'en',
      hasExplicitPreference: true,
      initialized: true,
    });
  });

  it('ignores malformed storage and falls back to browser detection', () => {
    storage.set('echotype_language_settings', '{bad json');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { language: 'zh-CN' },
    });

    useLanguageStore.getState().initialize();

    expect(useLanguageStore.getState()).toMatchObject({
      interfaceLanguage: 'zh',
      hasExplicitPreference: false,
      initialized: true,
    });
  });
});
