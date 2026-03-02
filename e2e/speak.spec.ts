import { test, expect } from '@playwright/test';

// Helper: wait for DB seed to complete, then reload so ContentList picks up the data
async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

test.describe('Speak / Read Module', () => {
  test('speak list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/speak');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak');
    await expect(page.getByText('Read English content aloud and get pronunciation feedback')).toBeVisible();

    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('speak list has search and type filters', async ({ page }) => {
    await page.goto('/speak');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });

  test('clicking content navigates to speak detail', async ({ page }) => {
    await waitForSeedAndReload(page, '/speak');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/speak\/.+/);
  });

  test('speak detail page has mic and controls', async ({ page }) => {
    await waitForSeedAndReload(page, '/speak');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/speak\/.+/);

    // Should show reference text
    await expect(page.getByText('Reference Text')).toBeVisible();
    // Should have Listen button for TTS
    await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
    // Should have mic button (green, round)
    const micButton = page.locator('button.rounded-full.bg-green-500');
    await expect(micButton).toBeVisible();
    // Should have Reset button
    await expect(page.getByText('Reset')).toBeVisible();
  });

  test('speak detail back button returns to list', async ({ page }) => {
    await waitForSeedAndReload(page, '/speak');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/speak\/.+/);

    await page.locator('a[href="/speak"]').first().click();
    await expect(page).toHaveURL(/\/speak$/);
  });

  test('speak detail shows content title and type', async ({ page }) => {
    await waitForSeedAndReload(page, '/speak');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/speak\/.+/);

    // Should show module indicator
    await expect(page.getByText('Speak / Read Mode')).toBeVisible();
  });
});
