import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 1000 } });

async function waitForSeedAndReload(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

async function waitForVoicePickerReady(page: Page) {
  const loadingVoices = page.getByText('Loading voices...');
  if (await loadingVoices.count()) {
    await expect(loadingVoices).not.toBeVisible({ timeout: 15000 });
  }

  await expect(
    page
      .getByPlaceholder('Search voices by name, accent, or provider...')
      .or(page.getByText('No voices available.')),
  ).toBeVisible({ timeout: 15000 });
}

async function findLibraryRow(page: Page, title: string): Promise<Locator> {
  await page.getByPlaceholder('Search content...').fill(title);
  const row = page.locator('[data-testid^="library-content-row-"]').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  return row;
}

test.describe('Parity Smoke', () => {
  test('web shell core flows stay healthy and library actions remain clickable with chat open', async ({ page }) => {
    const title = `Parity Smoke ${Date.now()}`;

    await waitForSeedAndReload(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome to EchoType');
    await expect(page.getByLabel('Open AI chat')).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Voice & Speech' })).toBeVisible();
    await waitForVoicePickerReady(page);

    await waitForSeedAndReload(page, '/library/import');
    await page.getByPlaceholder('Enter a title...').fill(title);
    await page
      .getByPlaceholder('Paste or type English content here...')
      .fill('This is a parity smoke test sentence for EchoType.');
    await expect(page.locator('text=Detected type').locator('..')).toContainText('sentence');
    await page.getByRole('button', { name: 'Import Content' }).click();

    await expect(page).toHaveURL(/\/library$/);
    let row = await findLibraryRow(page, title);

    await page.getByLabel('Open AI chat').click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();

    await row.locator('[data-testid^="library-action-listen-"]').click();
    await expect(page).toHaveURL(/\/listen\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible();

    await page.goto('/library');
    row = await findLibraryRow(page, title);
    await row.locator('[data-testid^="library-action-write-"]').click();
    await expect(page).toHaveURL(/\/write\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);

    const typingArea = page.locator('.cursor-text').first();
    await typingArea.click();
    await page.locator('input[aria-label="Typing input"]').press('T');
    await expect(page.getByText('Click here and start typing...')).not.toBeVisible({ timeout: 3000 });
  });
});
