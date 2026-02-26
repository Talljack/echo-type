import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('settings page loads with AI config section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');
    await expect(page.getByText('AI Model Configuration')).toBeVisible();
    await expect(page.getByText('OpenAI API Key')).toBeVisible();
    await expect(page.getByText('Anthropic API Key')).toBeVisible();
    await expect(page.getByText('DeepSeek API Key')).toBeVisible();
  });

  test('settings page has speech settings section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Speech Settings')).toBeVisible();
    await expect(page.getByText('Default TTS Speed')).toBeVisible();
    // Speed buttons
    await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
  });

  test('settings has save button', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible();
  });

  test('API key inputs are password type', async ({ page }) => {
    await page.goto('/settings');
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    expect(count).toBe(3);
  });
});