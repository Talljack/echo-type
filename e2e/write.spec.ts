import { test, expect } from '@playwright/test';

// Helper: wait for DB seed to complete, then reload so ContentList picks up the data
async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

test.describe('Write Module', () => {
  test('write list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Write');
    await expect(page.getByText('Practice typing English with real-time feedback')).toBeVisible();

    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('write list has search and type filters', async ({ page }) => {
    await page.goto('/write');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });

  test('clicking content navigates to write detail', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/write\/.+/);
  });

  test('write detail page has typing area and stats', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/write\/.+/);

    // Should show Write Mode indicator
    await expect(page.getByText('Write Mode')).toBeVisible();
    // Should show stats
    await expect(page.locator('text=/\\d+%/')).toBeVisible();
    await expect(page.getByText('WPM')).toBeVisible();
    // Should have Reset button
    await expect(page.getByText('Reset')).toBeVisible();
    // Should have hidden input for typing
    await expect(page.locator('input[aria-label="Typing input"]')).toBeAttached();
    // Should show prompt to start typing
    await expect(page.getByText('Click here and start typing...')).toBeVisible();
  });

  test('write detail typing interaction works', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/write\/.+/);

    // Click the card to focus the hidden input
    await page.locator('.cursor-text').click();

    // Type the first character — the prompt should disappear
    const input = page.locator('input[aria-label="Typing input"]');
    await input.press('h');

    // After typing, the idle prompt should be gone
    await expect(page.getByText('Click here and start typing...')).not.toBeVisible({ timeout: 3000 });
  });

  test('write detail back button returns to list', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/write\/.+/);

    await page.locator('a[href="/write"]').first().click();
    await expect(page).toHaveURL(/\/write$/);
  });

  test('write detail correct typing turns characters green', async ({ page }) => {
    await waitForSeedAndReload(page, '/write');

    // Click first item (should be a word like 'hello')
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/write\/.+/);

    // Focus input
    await page.locator('.cursor-text').click();
    const input = page.locator('input[aria-label="Typing input"]');

    // Get the first character of the displayed text
    const firstChar = page.locator('.font-mono span').first();
    const charText = await firstChar.textContent();

    if (charText) {
      // Type the correct first character
      await input.press(charText.trim());
      // The first character should now be green (correct)
      await expect(firstChar).toHaveClass(/text-green-600/, { timeout: 2000 });
    }
  });
});
