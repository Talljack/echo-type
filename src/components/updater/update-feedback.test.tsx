import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateStatus } from '@/stores/updater-store';

const state = vi.hoisted(() => ({
  status: 'idle' as UpdateStatus,
  interfaceLanguage: 'en' as 'en' | 'zh',
  downloadProgress: 42,
  newVersion: '1.5.2',
  error: '',
  openDialog: vi.fn(),
  checkForUpdate: vi.fn(),
  downloadUpdate: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({ IS_TAURI: true, IS_IOS_NATIVE_HOST: false, detectIOSNativeHost: () => false }));
vi.mock('next/navigation', () => ({ usePathname: () => '/settings' }));
vi.mock('@/components/auth/user-menu', () => ({ UserMenu: () => null }));
vi.mock('@/components/updater/update-dialog', () => ({ UpdateDialog: () => null }));
vi.mock('@/stores/updater-store', () => ({
  useUpdaterStore: (selector?: (value: typeof state) => unknown) => (selector ? selector(state) : state),
}));
vi.mock('@/stores/language-store', () => ({
  useLanguageStore: (selector: (value: typeof state) => unknown) => selector(state),
}));

import { Sidebar } from '@/components/layout/sidebar';
import { AboutSection } from '@/components/settings/about-section';

beforeEach(() => {
  state.status = 'idle';
  state.interfaceLanguage = 'en';
});

for (const [language, latest, download, downloading] of [
  ['en', "You're up to date", 'Download Update', 'Downloading'],
  ['zh', '当前已是最新版本', '下载更新', '下载中'],
] as const) {
  describe(`${language} updater feedback`, () => {
    beforeEach(() => {
      state.interfaceLanguage = language;
    });

    it('shows the latest-version result on the settings button', () => {
      state.status = 'up-to-date';
      expect(renderToStaticMarkup(<AboutSection />)).toContain(latest.replaceAll("'", '&#x27;'));
    });

    it('offers an explicit download button above Settings', () => {
      state.status = 'available';
      const markup = renderToStaticMarkup(<Sidebar />);
      expect(markup).toContain(download);
      expect(markup.indexOf(download)).toBeLessThan(markup.indexOf('href="/settings"'));
    });

    it('keeps download progress visible in the sidebar', () => {
      state.status = 'downloading';
      const markup = renderToStaticMarkup(<Sidebar />);
      expect(markup).toContain(downloading);
      expect(markup).toContain('42%');
    });

    it('does not claim latest when the check fails', () => {
      state.status = 'error';
      expect(renderToStaticMarkup(<AboutSection />)).not.toContain(latest.replaceAll("'", '&#x27;'));
    });
  });
}
