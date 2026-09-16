import { expect, test } from '@playwright/test';
import { processFile, publishMaterial } from './helpers/material-import';

test('one library imports word books in a dialog and keeps filtering and learning together', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Learning materials', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Section navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Import material', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Import material', exact: true }).click();
  for (const [title, text] of [['Reading notebook', 'word,meaning\nhelpful,有帮助的'], ['Second notebook', 'word,meaning\nkind,友善的']]) {
    await processFile(page, { name: title + '.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
    await publishMaterial(page);
    await page.getByRole('button', { name: 'Continue adding', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Close import', exact: true }).click();
  await page.getByRole('button', { name: 'Reading · Books', exact: true }).click();
  await expect(page.getByRole('link', { name: /Reading notebook/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Word books', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Study Reading notebook', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Study Reading notebook', exact: true }).click();
  await page.getByRole('button', { name: 'Start vocabulary practice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'helpful', exact: true })).toBeVisible();
  await page.goto('/library?import=file');
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Learn', exact: true }).first().click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start first lesson', exact: true })).toHaveAttribute('href', /\/learn\//);
});

test('old import and wordbook links return to the same library', async ({ page }) => {
  await page.goto('/library/import?job=existing-job');
  await expect(page).toHaveURL(/\/library\?.*job=existing-job/);
  await expect(page.getByRole('dialog', { name: 'Add learning material' })).toBeVisible();
  await page.goto('/library/wordbooks');
  await expect(page).toHaveURL(/\/library\?/);
  await expect(page.getByRole('dialog', { name: 'Add learning material' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learning materials', exact: true })).toBeAttached();
});

test('import dialog exposes each source and preserves drafts after Escape', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('button', { name: 'Import material', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add learning material' });
  for (const name of ['Paste text', 'Paste link', 'Upload file'])
    await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Paste link', exact: true }).click();
  await dialog.getByLabel('Source URL').fill('https://example.com/article');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Import material', exact: true }).click();
  await expect(dialog.getByLabel('Source URL')).toHaveValue('https://example.com/article');
  await dialog.getByRole('button', { name: 'Upload file', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Choose files', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Paste text', exact: true }).click();
  await dialog.getByLabel('Your text', { exact: true }).fill('We learn English together.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Import material', exact: true }).click();
  await expect(dialog.getByLabel('Your text', { exact: true })).toHaveValue('We learn English together.');
  await dialog.getByRole('button', { name: 'Review content', exact: true }).click();
  await dialog.getByLabel('Material title', { exact: true }).fill('Modal text material');
  await publishMaterial(page);
  await dialog.getByRole('button', { name: 'Close import', exact: true }).click();
  await page.getByPlaceholder('Search materials…').fill('Modal text material');
  await expect(page.getByRole('heading', { name: 'Modal text material', exact: true })).toBeVisible();
});
