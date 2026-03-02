import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('settings page loads with AI config section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();
    await expect(page.getByText('Provider', { exact: true })).toBeVisible();
    await expect(page.getByText('API Key', { exact: true })).toBeVisible();
  });

  test('settings page has speech settings section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Voice & Speech' })).toBeVisible();
    await expect(page.getByText('Speed', { exact: true }).first()).toBeVisible();
  });

  test('API key inputs are password type', async ({ page }) => {
    await page.goto('/settings');
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
