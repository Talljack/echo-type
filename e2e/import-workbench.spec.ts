import { expect, test } from '@playwright/test';

test('text import guides source, review and completion in one stable dialog', async ({ page }) => {
  await page.goto('/library?import=text');
  const dialog = page.getByRole('dialog', { name: 'Add learning material' });
  await expect(dialog.getByRole('navigation', { name: 'Import progress' })).toBeVisible({ timeout: 15000 });
  await expect(dialog.getByText('Choose source', { exact: true })).toHaveAttribute('aria-current', 'step');
  await page.getByLabel('Import title', { exact: true }).fill('Cafe conversation');
  await page.getByLabel('Import text content', { exact: true }).fill('Anna: A coffee, please.\nBen: Of course.');
  await page.getByRole('button', { name: 'Review material', exact: true }).click();
  await expect(dialog.getByText('Review material', { exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByLabel('Material type', { exact: true })).toHaveValue('dialogue');
  await expect(page.getByLabel('Speaker 1', { exact: true })).toHaveValue('Anna');
  await page.getByLabel('Turn 1', { exact: true }).fill('A tea, please.');
  await page.getByRole('button', { name: 'Back to source', exact: true }).click();
  await expect(page.getByLabel('Import text content', { exact: true })).toHaveValue('Anna: A tea, please.\nBen: Of course.');
  await page.getByRole('button', { name: 'Review material', exact: true }).click();
  await page.getByTestId('text-import-submit').click();
  await expect(dialog.getByText('Ready to learn', { exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(dialog.getByRole('link', { name: /Start learning/ })).toBeVisible();
});

test('small-screen source picker keeps actions inside the dialog', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/library?import=text');
  await page.getByLabel('Import text content', { exact: true }).fill('A short English article.');
  const footer = page.getByTestId('import-action-bar');
  await expect(footer.getByRole('button', { name: 'Review material', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a text file can be classified as a scenario during review', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'hotel.txt', mimeType: 'text/plain', buffer: Buffer.from('Ask for a hotel room for two nights.') });
  await page.getByTestId('import-process').click();
  await page.getByLabel('Material type', { exact: true }).selectOption('scenario');
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByLabel('Communication goal', { exact: true }).fill('Book a room for two nights.');
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await expect(page.getByText('Goal: Book a room for two nights.')).toBeVisible();
});

test('a file import keeps selected tags when it is published to the library', async ({ page }) => {
  await page.goto('/library?import=file');
  await page
    .getByTestId('durable-import-file')
    .setInputFiles({ name: 'team-note.txt', mimeType: 'text/plain', buffer: Buffer.from('The team shipped a reliable release.') });
  await page.getByTestId('import-process').click();
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('');
  await page.getByRole('textbox', { name: 'Tags', exact: true }).pressSequentially('work, release');
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        new Promise<string[]>((resolve, reject) => {
          const request = indexedDB.open('echotype:anonymous');
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction('contents');
            const all = transaction.objectStore('contents').getAll();
            all.onsuccess = () => {
              const item = all.result.find((entry) => entry.title === 'team-note');
              database.close();
              resolve(item?.tags || []);
            };
            all.onerror = () => reject(all.error);
          };
          request.onerror = () => reject(request.error);
        }),
      ),
    )
    .toEqual(['imported', 'work', 'release']);
});

test('a selected file does not block importing a new link', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('First source.') });
  await page.getByRole('button', { name: 'Paste link', exact: true }).click();
  await page.getByLabel('Source URL', { exact: true }).fill('https://example.com/lesson');
  await expect(page.getByRole('button', { name: 'Add URL', exact: true })).toBeVisible();
});

test('an invalid replacement wordbook shows its error rather than old success', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'words.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhelpful,有帮助的') });
  await page.getByRole('button', { name: 'Import word book', exact: true }).click();
  await expect(page.getByText('Word book imported.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choose another file', exact: true }).click();
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'oversized.csv', mimeType: 'text/csv', buffer: Buffer.alloc(20000001, 'a') });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('up to 20 MB');
  await expect(page.getByText('Word book imported.', { exact: true })).toHaveCount(0);
});
