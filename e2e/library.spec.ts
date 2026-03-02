import { test, expect } from '@playwright/test';

test.describe('Library & Content Management', () => {
  test('library page loads with seed content', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
    // Should have content items from seed
    const items = page.locator('[data-state="open"] [class*="grid"] > div');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('library has search and filter controls', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Levels' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Content' })).toBeVisible();
  });

  test('library type filter works', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    // Check that accordion section headers exist for content types
    await expect(page.getByText('Words').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sentences').first()).toBeVisible({ timeout: 10000 });
  });

  test('library search filter works', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await page.getByPlaceholder('Search content...').fill('hello');
    await page.waitForTimeout(500);

    // Should find the 'hello' word
    await expect(page.getByText('hello').first()).toBeVisible();
  });

  test('import content page loads', async ({ page }) => {
    await page.goto('/library/import');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Import Content');
    await expect(page.getByPlaceholder('Enter a title...')).toBeVisible();
    await expect(page.getByPlaceholder('Paste or type English content here...')).toBeVisible();
  });

  test('import content flow works', async ({ page }) => {
    await page.goto('/library/import');

    // Fill in content
    await page.getByPlaceholder('Enter a title...').fill('E2E Test Content');
    await page.getByPlaceholder('Paste or type English content here...').fill('This is a test sentence for E2E testing.');

    // Should auto-detect type as sentence (use the detected type indicator, not the button)
    await expect(page.locator('text=Detected type').locator('..').getByText('sentence')).toBeVisible();

    // Click import
    await page.getByRole('button', { name: 'Import Content' }).click();

    // Should redirect to library
    await expect(page).toHaveURL(/\/library/, { timeout: 5000 });

    // Should see the imported content
    await page.waitForTimeout(1000);
    await expect(page.getByText('E2E Test Content').first()).toBeVisible({ timeout: 5000 });
  });

  test('library has action buttons for each content item', async ({ page }) => {
    await page.goto('/library');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    // Each item should have listen, speak, write action buttons
    const firstItem = page.locator('[data-state="open"] [class*="grid"] > div').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    // Check for icon buttons (headphones, mic, pen)
    const buttons = firstItem.locator('button, a');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('import page detects content types correctly', async ({ page }) => {
    await page.goto('/library/import');

    // Single word -> word
    await page.getByPlaceholder('Paste or type English content here...').fill('hello');
    await expect(page.locator('text=Detected type').locator('..')).toContainText('word');

    // Short phrase -> phrase
    await page.getByPlaceholder('Paste or type English content here...').fill('good morning friend');
    await expect(page.locator('text=Detected type').locator('..')).toContainText('phrase');

    // Longer text -> sentence
    await page.getByPlaceholder('Paste or type English content here...').fill('This is a longer sentence that should be detected as a sentence type.');
    await expect(page.locator('text=Detected type').locator('..')).toContainText('sentence');
  });
});
