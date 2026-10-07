import { expect, test } from '@playwright/test';

async function mockDesktopUpdater(page: import('@playwright/test').Page, available: boolean) {
  await page.addInitScript(({ available }) => {
    const host = window as unknown as {
      __TAURI_INTERNALS__: Record<string, unknown>;
      updaterChecks: number;
      updaterDownloads: number;
      finishUpdateDownload?: () => void;
    };
    host.updaterChecks = 0;
    host.updaterDownloads = 0;
    host.__TAURI_INTERNALS__ = {
      transformCallback: () => 1,
      unregisterCallback: () => {},
      invoke: async (command: string, args?: { onEvent?: { onmessage: (event: unknown) => void } }) => {
        if (command === 'plugin:app|version') return '1.5.1';
        if (command === 'plugin:updater|check') {
          host.updaterChecks++;
          return available ? { rid: 1, currentVersion: '1.5.1', version: '1.5.2', body: 'Update test' } : null;
        }
        if (command === 'plugin:updater|download_and_install') {
          host.updaterDownloads++;
          args?.onEvent?.onmessage({ event: 'Started', data: { contentLength: 100 } });
          args?.onEvent?.onmessage({ event: 'Progress', data: { chunkLength: 42 } });
          await new Promise<void>((resolve) => { host.finishUpdateDownload = resolve; });
        }
        return null;
      },
    };
  }, { available });
}

test('latest-version button supports rechecking and switching languages', async ({ page }) => {
  await mockDesktopUpdater(page, false);
  await page.goto('/settings');
  const latest = page.getByRole('button', { name: "You're up to date", exact: true });
  await expect(latest).toBeVisible();
  const before = await page.evaluate(() => (window as unknown as { updaterChecks: number }).updaterChecks);
  await latest.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { updaterChecks: number }).updaterChecks)).toBeGreaterThan(before);
  await page.getByTestId('settings-language-zh').click();
  await expect(page.getByRole('button', { name: '当前已是最新版本', exact: true })).toBeVisible();
  await page.getByTestId('settings-language-en').click();
  await expect(latest).toBeVisible();
});

test('sidebar downloads an available update and keeps progress and restart accessible', async ({ page }) => {
  await mockDesktopUpdater(page, true);
  await page.goto('/settings');
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('button', { name: 'Download Update', exact: true })).toBeVisible();
  await page.getByTestId('settings-language-zh').click();
  await expect(sidebar.getByRole('button', { name: '下载更新', exact: true })).toBeVisible();
  await page.getByTestId('settings-language-en').click();
  await sidebar.getByRole('button', { name: 'Download Update', exact: true }).click();
  await expect(sidebar.getByRole('button', { name: 'Downloading 42%', exact: true, includeHidden: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { updaterDownloads: number }).updaterDownloads)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(sidebar.getByRole('button', { name: 'Downloading 42%', exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { finishUpdateDownload: () => void }).finishUpdateDownload());
  await sidebar.getByRole('button', { name: 'Restart to Update', exact: true }).click();
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(sidebar.getByRole('button', { name: 'Restart to Update', exact: true })).toBeVisible();
  await sidebar.getByRole('button', { name: 'Collapse', exact: true }).click();
  await expect(sidebar.getByRole('button', { name: 'Restart to Update', exact: true })).toBeVisible();
});
