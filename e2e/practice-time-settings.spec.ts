import { expect, test } from '@playwright/test';

for (const [locale, heading, minuteLabel, changeLabel] of [
  ['en-US', 'Practice schedule', '30 min', 'Change practice time'],
  ['zh-CN', '练习时间安排', '30 分钟', '调整练习时间'],
] as const) {
  test.describe(locale, () => {
    test.use({ locale });
    test('practice time is configured in Settings and drives the dashboard after reload', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('main[data-seeded="true"]').waitFor();
      await expect(page.getByTestId('daily-task-queue')).toBeVisible();
      await expect(page.getByRole('button', { name: changeLabel })).toHaveCount(0);
      await page.goto('/settings#practice-time');
      const settings = page.getByTestId('practice-time-settings');
      await expect(settings.getByRole('heading', { name: heading })).toBeVisible();
      await settings.getByRole('button', { name: minuteLabel, exact: true }).click();
      await expect(settings.getByRole('button', { name: minuteLabel, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(settings.getByRole('button', { name: minuteLabel, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.setViewportSize({ width: 375, height: 850 });
      expect(await settings.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.goto('/dashboard');
      await expect(page.getByTestId('daily-budget')).toHaveText('30');
      await expect(page.getByRole('button', { name: changeLabel })).toHaveCount(0);
    });
  });
}
