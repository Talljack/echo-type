import { expect, test } from '@playwright/test';

test('provider configuration survives a page restart and is not stored as plaintext', async ({ page }) => {
  const testKey = 'gsk_e2e_persistence_key_1234';

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();
  const noModelApi = page.getByRole('checkbox', { name: /No model API support/i });
  await noModelApi.locator('..').click();
  await expect(noModelApi).toBeChecked();
  await page.locator('#provider-api-key').fill(testKey);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByText('Connected', { exact: true }).first()).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate((key) => {
        const value = localStorage.getItem('echotype_provider_config') || '';
        return value.length > 0 && !value.includes(key);
      }, testKey),
    )
    .toBe(true);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();
  await expect(page.getByText('Connected', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#provider-api-key')).toHaveAttribute('type', 'password');
  await expect(page.locator('#provider-api-key')).toHaveAttribute('placeholder', /gsk_e2e.*1234/);
});

test('manual model refresh also evaluates recommendations', async ({ page }) => {
  let recommendationRequests = 0;
  await page.route('**/api/models?providerId=groq', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        dynamic: true,
        models: [
          { id: 'model-a', name: 'Model A' },
          { id: 'model-b', name: 'Model B' },
        ],
      }),
    });
  });
  await page.route('**/api/model-recommendations?providerId=groq', async (route) => {
    recommendationRequests += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        recommendations: [{ modelId: 'model-b', rank: 1, score: 90, reason: 'Best fit', label: 'Recommended' }],
      }),
    });
  });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'AI Provider' })).toBeVisible();
  await page.locator('#provider-api-key').fill('gsk_e2e_model_refresh_key');
  await page.getByRole('button', { name: 'Fetch model list', exact: true }).click();

  await expect.poll(() => recommendationRequests).toBe(1);
});
