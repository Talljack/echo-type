import { expect, test } from '@playwright/test';

async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

test.describe('Read Module', () => {
  async function openFirstReadDetail(page: import('@playwright/test').Page) {
    await waitForSeedAndReload(page, '/read');
    await page.getByRole('button', { name: /Sentence \(\d+\)/ }).click();

    const detailLink = page.locator('a[href^="/read/"]:not([href*="/book/"])').first();
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    await detailLink.click();
    await expect(page).toHaveURL(/\/read\/(?!book\/).+/);
  }

  test('read list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/read');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Read');
    await expect(page.getByText('Read English content aloud and get pronunciation feedback')).toBeVisible();

    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('read detail page shows stable practice controls without transcript card', async ({ page }) => {
    await openFirstReadDetail(page);

    await expect(page.getByText('Reference Text')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
    await expect(page.getByText('Reset')).toBeVisible();
    await expect(page.getByText('Read Aloud Mode')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Speech' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Live Reading Feedback' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your Results' })).toHaveCount(0);
  });

  test('read detail back button returns to list', async ({ page }) => {
    await openFirstReadDetail(page);

    await page.locator('a[href="/read"]').first().click();
    await expect(page).toHaveURL(/\/read$/);
  });
});
