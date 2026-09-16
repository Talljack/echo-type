import { expect, test } from '@playwright/test';
import { importWordbook, processFile, publishMaterial, resumeReview } from './helpers/material-import';

test('text import guides source, review and completion in one stable dialog', async ({ page }) => {
  await page.goto('/library?import=text');
  const dialog = page.getByRole('dialog', { name: 'Add learning material' });
  await expect(dialog.getByRole('navigation', { name: 'Import progress' })).toBeVisible();
  await page.getByLabel('Your text', { exact: true }).fill('Anna: A coffee, please.\nBen: Of course.');
  await page.getByRole('button', { name: 'Review content', exact: true }).click();
  await page.getByLabel('Material title', { exact: true }).fill('Cafe conversation');
  await expect(page.getByLabel('Material type', { exact: true })).toHaveValue('dialogue');
  await expect(page.getByLabel('Speaker 1', { exact: true })).toHaveValue('Anna');
  await page.getByLabel('Line 1', { exact: true }).fill('A tea, please.');
  await page.getByRole('button', { name: 'Back to source', exact: true }).click();
  await resumeReview(page);
  await expect(page.getByLabel('Line 1', { exact: true })).toHaveValue('A tea, please.');
  await publishMaterial(page);
});

test('small-screen source picker keeps actions inside the dialog', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/library?import=text');
  await page.getByLabel('Your text', { exact: true }).fill('A short English article.');
  await expect(page.getByTestId('import-action-bar').getByRole('button', { name: 'Review content', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a text file can be classified as a scenario during review', async ({ page }) => {
  await page.goto('/library?import=file');
  await processFile(page, { name: 'hotel.txt', mimeType: 'text/plain', buffer: Buffer.from('Ask for a hotel room for two nights.') });
  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Material type', { exact: true }).selectOption('scenario');
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByLabel('Your role', { exact: true }).fill('Guest');
  await page.getByLabel('Communication goal', { exact: true }).fill('Book a room for two nights.');
  await publishMaterial(page);
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await expect(page.getByText('Goal: Book a room for two nights.')).toBeVisible();
});

test('a file import keeps selected tags when it is published to the library', async ({ page }) => {
  await page.goto('/library?import=file');
  await processFile(page, { name: 'team-note.txt', mimeType: 'text/plain', buffer: Buffer.from('The team shipped a reliable release.') });
  await page.getByLabel('Add tag', { exact: true }).fill('work, release');
  await page.getByLabel('Add tag', { exact: true }).press('Enter');
  await publishMaterial(page);
  const tags = await page.evaluate(() => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onsuccess = () => {
      const database = request.result;
      const all = database.transaction('contents').objectStore('contents').getAll();
      all.onsuccess = () => { database.close(); resolve(all.result.find(entry => entry.title === 'team-note')?.tags || []); };
      all.onerror = () => reject(all.error);
    };
    request.onerror = () => reject(request.error);
  }));
  expect(tags).toEqual(['imported', 'work', 'release']);
});

test('a selected file does not block importing a new link', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('First source.') });
  await page.getByRole('button', { name: 'Paste link', exact: true }).click();
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.com/lesson');
  await expect(page.getByRole('button', { name: 'Start processing', exact: true })).toBeEnabled();
});

test('an invalid replacement wordbook shows its error rather than old success', async ({ page }) => {
  await importWordbook(page, 'words', 'word,meaning\nhelpful,有帮助的');
  await page.getByRole('button', { name: 'Continue adding', exact: true }).click();
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'oversized.csv', mimeType: 'text/csv', buffer: Buffer.alloc(21 * 1024 * 1024, 'a') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('File exceeds');
  await expect(page.getByTestId('import-ready')).toHaveCount(0);
});
