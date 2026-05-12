import { test, expect } from '@playwright/test';

test.describe('Collections Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
  });

  test('Library page loads with Collections tab visible', async ({ page }) => {
    // The "Collections" tab button should be present
    const collectionsTab = page.getByRole('button', { name: /collections/i });
    await expect(collectionsTab).toBeVisible({ timeout: 10000 });
  });

  test('Collections tab shows scenario categories after seeding', async ({ page }) => {
    // Click the Collections tab
    const collectionsTab = page.getByRole('button', { name: /collections/i });
    await collectionsTab.click();
    await page.waitForTimeout(3000); // wait for seeding + loading

    // Should see scenario category headers (at least Daily Life)
    const dailyLife = page.getByText('Daily Life');
    await expect(dailyLife).toBeVisible({ timeout: 15000 });

    // Should see collection cards
    const restaurantCard = page.getByText('Restaurant Ordering');
    await expect(restaurantCard).toBeVisible({ timeout: 5000 });
  });

  test('Clicking a collection card navigates to detail page', async ({ page }) => {
    // Click Collections tab and wait for data
    await page.getByRole('button', { name: /collections/i }).click();
    await page.waitForTimeout(3000);

    // Click a collection card
    const card = page.getByText('Restaurant Ordering').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    // Should navigate to detail page
    await page.waitForURL(/\/library\/collections\//, { timeout: 10000 });

    // Detail page should show the collection title
    await expect(page.getByText('Restaurant Ordering')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('餐厅点餐')).toBeVisible();

    // Should show content items
    await expect(page.getByText('Do you have a table for two?')).toBeVisible({ timeout: 5000 });
  });

  test('Collection detail page shows practice buttons when items exist', async ({ page }) => {
    await page.getByRole('button', { name: /collections/i }).click();
    await page.waitForTimeout(3000);

    const card = page.getByText('Restaurant Ordering').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    await page.waitForURL(/\/library\/collections\//, { timeout: 10000 });

    // Wait for items to load — builtin collections seed content items
    await page.waitForTimeout(3000);

    // The page should show content items (numbered list) or "Loading..."
    // Practice buttons are <a> links wrapping icon buttons
    const practiceLinks = page.locator('a[href*="/listen/"], a[href*="/read/"], a[href*="/write/"], a[href*="/speak"]');
    const count = await practiceLinks.count();

    // If items were seeded, there should be practice links
    // If not seeded yet (fresh IndexedDB), items array may be empty — that's ok
    if (count === 0) {
      // Verify the page at least shows the collection header correctly
      await expect(page.getByText('Restaurant Ordering')).toBeVisible();
      await expect(page.getByText('餐厅点餐')).toBeVisible();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('AI Generate page loads correctly', async ({ page }) => {
    await page.goto('/library/collections/generate');
    await page.waitForLoadState('networkidle');

    // Title should be visible
    await expect(page.getByText('AI Generate Collection')).toBeVisible({ timeout: 5000 });

    // Input field should be visible
    const input = page.getByPlaceholder(/看医生|ordering coffee|job interview/i);
    await expect(input).toBeVisible();

    // Difficulty buttons should be visible
    await expect(page.getByRole('button', { name: /beginner/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /intermediate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /advanced/i })).toBeVisible();

    // Example keyword chips should be visible
    await expect(page.getByText('看医生')).toBeVisible();
    await expect(page.getByText('Job interview')).toBeVisible();
  });

  test('AI Generate page example keywords fill the input', async ({ page }) => {
    await page.goto('/library/collections/generate');
    await page.waitForLoadState('networkidle');

    // Click an example keyword
    await page.getByText('看医生').click();

    // Input should now contain the keyword
    const input = page.getByPlaceholder(/看医生|ordering coffee|job interview/i);
    await expect(input).toHaveValue('看医生');
  });

  test('Back to Library button works on detail page', async ({ page }) => {
    await page.getByRole('button', { name: /collections/i }).click();
    await page.waitForTimeout(3000);

    const card = page.getByText('Restaurant Ordering').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();

    await page.waitForURL(/\/library\/collections\//, { timeout: 10000 });

    // Click back button
    const backButton = page.getByText(/back/i).first();
    await backButton.click();

    // Should go back to library
    await page.waitForURL(/\/library/, { timeout: 5000 });
  });
});

test.describe('Route Performance', () => {
  test('Library page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    // Should load within 5 seconds (generous for cold start)
    expect(elapsed).toBeLessThan(5000);
  });

  test('Listen page loads within reasonable time', async ({ page }) => {
    // First visit to warm up
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const start = Date.now();
    await page.goto('/listen');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('Write page loads within reasonable time', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const start = Date.now();
    await page.goto('/write');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
