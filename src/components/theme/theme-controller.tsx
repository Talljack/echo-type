'use client';

import { useEffect } from 'react';
import { APPEARANCE_STORAGE_KEY, type Theme, useAppearanceStore } from '@/stores/appearance-store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia?.(DARK_QUERY).matches ?? false;
  const resolved = resolveTheme(theme, prefersDark);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

/**
 * Keeps the `dark` class on <html> in sync with the Appearance setting and,
 * for "system", with the OS preference. The inline script in the root layout
 * applies the same logic before first paint so there is no flash.
 */
export function ThemeController() {
  const theme = useAppearanceStore((state) => state.theme);

  useEffect(() => {
    useAppearanceStore.getState().hydrate();
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) useAppearanceStore.getState().hydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system' || !window.matchMedia) return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return null;
}

/** Runs before hydration (inlined in <head>) to avoid a light/dark flash. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t='system';var raw=localStorage.getItem('${APPEARANCE_STORAGE_KEY}');if(raw){var p=JSON.parse(raw);if(p&&p.theme)t=p.theme;}var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('${DARK_QUERY}').matches);var r=document.documentElement;if(d)r.classList.add('dark');r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
