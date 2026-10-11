import path from 'node:path';
import { expect, test } from '@playwright/test';

for (const [locale, title, examplesLabel, playLabel] of [
  ['en-US', 'English sounds', 'Example words', 'Play sound'],
  ['zh-CN', '英语音标', '例词', '播放音标'],
] as const) {
  test.describe(locale, () => {
    test.use({ locale });
    test('48 sounds play on selection with examples and a matching hear video', async ({ page }, testInfo) => {
      test.setTimeout(60000);
      await page.goto('/pronunciation');
      await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15000 });
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.locator('[data-sound-id]')).toHaveCount(48);
      await page.getByTestId('sound-tile-near').click();
      await expect(page.getByTestId('selected-sound')).toContainText('/ɪə/');
      await expect(page.getByRole('heading', { name: examplesLabel, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'hear', exact: true })).toBeVisible();
      await expect.poll(() => page.locator('audio[data-testid="sound-player"]').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'hear', exact: true }).click();
      await expect.poll(() => page.locator('audio[data-testid="sound-player"]').evaluate((element: HTMLAudioElement) => element.currentSrc)).toContain('/words/hear.mp3');
      await expect.poll(() => page.locator('audio[data-testid="sound-player"]').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      await expect(page.getByTestId('sound-video')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=vC0h4S0YPJc');
      await page.getByRole('button', { name: playLabel, exact: true }).click();
      await page.getByTestId('sound-tile-iy').click();
      await expect(page.getByTestId('selected-sound')).toContainText('/iː/');
      await expect(page.getByTestId('sound-tile-iy')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: /Record word|录音练习/ })).toHaveCount(0);
      await page.getByTestId('sound-tile-near').click();
      const screenshot = (size: string) => process.env.PRONUNCIATION_SCREENSHOT_DIR ? path.join(process.env.PRONUNCIATION_SCREENSHOT_DIR, `${testInfo.project.name}-${locale}-${size}.png`) : testInfo.outputPath(`${size}.png`);
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.screenshot({ path: screenshot('desktop'), fullPage: true });
      await page.setViewportSize({ width: 375, height: 812 });
      expect(await page.locator('main').last().evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByTestId('sound-tile-near').click();
      await expect(page.getByTestId('selected-sound')).toBeInViewport();
      await page.screenshot({ path: screenshot('mobile') });
    });
  });
}


test('all 48 bundled sound recordings decode to non-silent audio', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/pronunciation');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15000 });
  const checked = await page.evaluate(async () => {
    const urls = Array.from(document.querySelectorAll<HTMLElement>('[data-sound-id]')).map(tile => `/audio/pronunciation/sounds/${tile.dataset.soundId}.mp3`);
    const context = new AudioContext();
    const results: Array<{ url: string; duration: number; peak: number }> = [];
    try {
      for (let start = 0; start < urls.length; start += 4) {
        results.push(...await Promise.all(urls.slice(start, start + 4).map(async url => {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Missing audio: ${url}`);
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          let peak = 0;
          for (const sample of buffer.getChannelData(0)) peak = Math.max(peak, Math.abs(sample));
          return { url, duration: buffer.duration, peak };
        })));
      }
      return results;
    } finally { await context.close(); }
  });
  expect(checked).toHaveLength(48);
  for (const sample of checked) {
    expect(sample.duration, sample.url).toBeGreaterThan(0.08);
    expect(sample.peak, sample.url).toBeGreaterThan(0.005);
  }
});

test('desktop YouTube lesson opens through the native shell', async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { __TAURI_INTERNALS__: Record<string, unknown>; openedVideo?: string };
    host.__TAURI_INTERNALS__ = {
      transformCallback: () => 1, unregisterCallback: () => {},
      invoke: async (command: string, args?: { path?: string }) => {
        if (command === 'plugin:app|version') return '1.5.1';
        if (command === 'plugin:shell|open') host.openedVideo = args?.path;
        return null;
      },
    };
  });
  await page.goto('/pronunciation');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15000 });
  await page.getByTestId('sound-video').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { openedVideo?: string }).openedVideo)).toBe('https://www.youtube.com/watch?v=vC0h4S0YPJc');
});
