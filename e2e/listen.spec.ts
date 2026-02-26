import { test, expect } from '@playwright/test';

test.describe('Listen Module', () => {
  test('listen list page loads with content', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listen');
    await expect(page.getByText('Listen to English content with text-to-speech')).toBeVisible();

    // Should have content items
    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test('listen list has search and type filters', async ({ page }) => {
    await page.goto('/listen');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  });

  test('clicking content item navigates to detail page', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);

    const firstItem = page.locator('[class*="grid gap"] a').first();
    await expect(firstItem).toBeVisible({ timeout: 5000 });
    await firstItem.click();

    await expect(page).toHaveURL(/\/listen\/.+/);
  });

  test('listen detail page has playback controls', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);

    // Click first content item
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/listen\/.+/);

    // Should have Play button
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    // Should have Restart button
    await expect(page.getByText('Restart')).toBeVisible();
    // Should have speed controls
    await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
  });

  test('listen detail shows content text as clickable words', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/listen\/.+/);

    // Content text should be rendered as individual clickable spans
    const wordSpans = page.locator('.leading-relaxed span');
    const count = await wordSpans.count();
    expect(count).toBeGreaterThan(0);
  });

  test('listen detail back button returns to list', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/listen\/.+/);

    // Click back button
    await page.locator('a[href="/listen"]').first().click();
    await expect(page).toHaveURL(/\/listen$/);
  });

  test('listen speed control buttons are interactive', async ({ page }) => {
    await page.goto('/listen');
    await page.waitForTimeout(1500);
    await page.locator('[class*="grid gap"] a').first().click();
    await expect(page).toHaveURL(/\/listen\/.+/);

    // Click 0.75x speed
    await page.getByRole('button', { name: '0.75x' }).click();
    // The button should now be active (bg-indigo-600)
    await expect(page.getByRole('button', { name: '0.75x' })).toHaveClass(/bg-indigo-600/);
  });
});