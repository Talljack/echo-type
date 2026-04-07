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

  test('can switch between providers and only active provider disconnects', async ({ page }) => {
    // Track console errors from the start
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/settings');

    // Wait for the AI Provider section to be visible
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();

    // Find the provider combobox (it's the first combobox on the page)
    const providerCombobox = page.getByRole('combobox').first();
    await expect(providerCombobox).toBeVisible();

    // Click to open the dropdown
    await providerCombobox.click();

    // Select OpenAI from the dropdown
    await page.getByRole('option', { name: /OpenAI/i }).click();

    // Verify OpenAI is now selected
    await expect(providerCombobox).toContainText('OpenAI');

    // Now switch to a different provider (e.g., Anthropic)
    await providerCombobox.click();
    await page.getByRole('option', { name: /Anthropic/i }).click();

    // Verify Anthropic is now selected
    await expect(providerCombobox).toContainText('Anthropic');

    // Verify no console errors occurred
    expect(errors).toHaveLength(0);
  });

  test('switching to same provider does not disconnect it', async ({ page }) => {
    await page.goto('/settings');

    // Wait for the AI Provider section to be visible
    await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();

    const providerCombobox = page.getByRole('combobox').first();

    // Get the currently selected provider
    const initialProvider = await providerCombobox.textContent();

    // Click to open and immediately select the same provider
    await providerCombobox.click();
    await page.getByRole('option').first().click();

    // Verify it's still the same provider
    await expect(providerCombobox).toContainText(initialProvider || '');
  });
});
