import { test, expect } from '@playwright/test';

// Helper: wait for DB seed to complete, then reload so ContentList picks up the data
async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

// Helper: switch to a content tab (not wordbook) and click the first content item
async function navigateToContentDetail(page: import('@playwright/test').Page, module: string) {
  await waitForSeedAndReload(page, `/${module}`);
  // Switch to Phrase tab (default is Word Books which shows book cards, not content items)
  await page.locator('div.flex.gap-2 button', { hasText: 'Phrase' }).first().click();
  await page.waitForTimeout(500);
  const firstItem = page.locator('[class*="grid gap"] a').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
  await firstItem.click();
  await expect(page).toHaveURL(new RegExp(`\\/${module}\\/.+`));
}

test.describe('Listen Module', () => {
  test('listen list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/listen');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listen');
    await expect(page.getByText('Listen to English content with text-to-speech')).toBeVisible();

    // Should have content items (word book cards on default tab)
    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('listen list has search and type filters', async ({ page }) => {
    await page.goto('/listen');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    // ContentList uses tab-based layout with content type tabs
    const tabBar = page.locator('div.flex.gap-2');
    await expect(tabBar.locator('button', { hasText: 'Word Books' }).first()).toBeVisible();
    await expect(tabBar.locator('button', { hasText: 'Phrase' }).first()).toBeVisible();
  });

  test('clicking content item navigates to detail page', async ({ page }) => {
    await waitForSeedAndReload(page, '/listen');

    const firstItem = page.locator('[class*="grid gap"] a').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await firstItem.click();

    await expect(page).toHaveURL(/\/listen\/.+/);
  });

  test('listen detail page has playback controls', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Should have Play button
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    // Should have speed controls
    await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
  });

  test('listen detail shows content text as clickable words', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Content text is rendered as individual clickable buttons inside .leading-8 div
    const wordButtons = page.locator('.leading-8 button');
    await expect(wordButtons.first()).toBeVisible({ timeout: 5000 });
    const count = await wordButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('listen detail back button returns to list', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Click back button
    await page.locator('a[href="/listen"]').first().click();
    await expect(page).toHaveURL(/\/listen$/);
  });

  test('listen speed control buttons are interactive', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Click 0.75x speed
    await page.getByRole('button', { name: '0.75x' }).click();
    // The button should now be active (bg-indigo-600)
    await expect(page.getByRole('button', { name: '0.75x' })).toHaveClass(/bg-indigo-600/);
  });
});
