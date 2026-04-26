import { expect, test, type Page } from '@playwright/test';

const APP_URL = 'http://localhost:3010';

test.describe.configure({ mode: 'serial' });

async function waitForSeedAndReload(page: Page, path: string) {
  await page.goto(`${APP_URL}${path}`);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

async function navigateToListenDetail(page: Page) {
  await waitForSeedAndReload(page, '/listen');
  await page.locator('div.flex.gap-2 button', { hasText: 'Phrase' }).first().click();
  await page.waitForTimeout(300);

  const firstItem = page.locator('[data-testid^="listen-content-row-"]').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
  await firstItem.click();

  await expect(page).toHaveURL(/\/listen\/.+/);
}

test.describe('P0 Learning Loop', () => {
  test('listen detail supports hide text and dictation', async ({ page }) => {
    await navigateToListenDetail(page);

    await page.getByRole('tab', { name: 'Hide text' }).click();
    await expect(page.getByTestId('listen-hidden-transcript')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal transcript' })).toBeVisible();

    await page.getByRole('tab', { name: 'Dictation' }).click();
    await expect(page).toHaveURL(/mode=dictation/);
    await expect(page.getByTestId('listen-dictation-panel')).toBeVisible();
    await expect(page.getByTestId('listen-dictation-input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check dictation' })).toBeVisible();
  });

  test('failed dictation creates a weak spot and retry link', async ({ page }) => {
    await navigateToListenDetail(page);

    await page.getByRole('tab', { name: 'Dictation' }).click();
    await expect(page).toHaveURL(/mode=dictation/);

    const input = page.getByTestId('listen-dictation-input');
    await expect(input).toBeEditable();
    await input.fill('totally wrong sentence');

    const checkButton = page.getByRole('button', { name: 'Check dictation' });
    await expect(checkButton).toBeEnabled();
    await checkButton.click();

    await expect(page.getByTestId('listen-dictation-result')).toContainText('Accuracy');

    await page.goto(`${APP_URL}/weak-spots`);
    await expect(page.getByText('Most urgent weak spots')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('dictation-sentence')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Retry' })).toBeVisible();
  });
});
