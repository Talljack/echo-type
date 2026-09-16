import { expect, test } from '@playwright/test';

test('invalid replacement wordbook preserves the existing draft', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'keep.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,greeting') });
  await expect(page.getByText('1 words · 0 duplicates', { exact: true })).toBeVisible();
  await page.locator('input[accept=".csv,.tsv,.txt"]').setInputFiles({ name: 'bad.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('bad') });
  await expect(page.getByRole('alert').filter({ hasText: 'Export Excel' })).toBeVisible();
  await expect(page.getByText('1 words · 0 duplicates', { exact: true })).toBeVisible();
});

test('wordbook template is available from the single file entry', async ({ page }) => {
  await page.goto('/library?import=file');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download word book template', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('echotype-wordbook-template.csv');
});

test('cancelling an active import aborts the request and retains the original', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => {
      if (String(input) === '/api/import/extract-text') return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => { document.documentElement.dataset.importAborted = 'yes'; reject(new DOMException('Aborted', 'AbortError')); });
      });
      return original(input, init);
    };
  });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'cancel.txt', mimeType: 'text/plain', buffer: Buffer.from('Original to keep.') });
  await page.getByTestId('import-process').click();
  await expect(page.getByRole('status', { name: 'Import processing' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel task (keep original)', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-import-aborted', 'yes');
  await expect(page.getByRole('button', { name: 'Download original file', exact: true })).toBeVisible();
  await expect(page.getByTestId('import-process')).toBeEnabled();
});

test('text review survives refresh without manual saving', async ({ page }) => {
  await page.goto('/library?import=text');
  await page.getByLabel('Import text content').fill('My original English paragraph.');
  await page.getByRole('button', { name: 'Review material', exact: true }).click();
  await page.getByLabel('Import title').fill('Recovered title');
  await expect(page.getByTestId('text-draft-status')).toContainText('Saved on this device');
  await page.reload();
  await expect(page.getByLabel('Import title')).toHaveValue('Recovered title');
  await expect(page.getByTestId('text-import-submit')).toBeVisible();
});

test('wordbook review can be resumed after refresh', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'restore.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,greeting') });
  await expect(page.getByTestId('vocabulary-draft-status')).toContainText('Saved on this device');
  await page.reload();
  await page.getByRole('button', { name: 'Resume word book draft', exact: true }).click();
  await expect(page.getByText('1 words · 0 duplicates', { exact: true })).toBeVisible();
});

test('file edits autosave before reopening the saved task', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'auto.txt', mimeType: 'text/plain', buffer: Buffer.from('Original.') });
  await page.getByTestId('import-process').click();
  await page.getByTestId('import-block-text').fill('Automatically saved correction.');
  await expect(page.getByTestId('file-draft-status')).toContainText('Saved on this device');
  await page.reload();
  await page.getByText('Saved import tasks', { exact: false }).click();
  await page.getByTestId('import-resume').first().click();
  await expect(page.getByTestId('import-block-text')).toHaveValue('Automatically saved correction.');
});

test('dragging multiple files creates a resumable batch queue', async ({ page }) => {
  await page.goto('/library?import=file');
  const files = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(['One.'], 'one.txt', { type: 'text/plain' }));
    data.items.add(new File(['Two.'], 'two.txt', { type: 'text/plain' }));
    return data;
  });
  await page.getByTestId('material-drop-zone').dispatchEvent('drop', { dataTransfer: files });
  await expect(page.getByTestId('import-resume')).toHaveCount(2);
  await expect(page.getByTestId('material-source-summary')).toContainText('one.txt');
  await page.reload();
  await page.getByText('Saved import tasks', { exact: false }).click();
  await expect(page.getByTestId('import-resume')).toHaveCount(2);
});

test('file review replaces the drop zone with a compact source row', async ({ page }) => {
  await page.goto('/library?import=file');
  await expect(page.getByTestId('material-drop-zone')).toBeVisible();
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'review.txt', mimeType: 'text/plain', buffer: Buffer.from('English practice.') });
  await expect(page.getByTestId('material-source-summary')).toContainText('review.txt');
  await expect(page.getByTestId('material-drop-zone')).toHaveCount(0);
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-block-text')).toHaveValue('English practice.');
  await expect(page.getByTestId('material-source-summary')).toBeVisible();
});

test('processing explains its current stage without invented percentages', async ({ page }) => {
  await page.route('**/api/import/extract-text', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({ json: { text: 'English practice.', metadata: {} } });
  });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'slow.txt', mimeType: 'text/plain', buffer: Buffer.from('English practice.') });
  await page.getByTestId('import-process').click();
  await expect(page.getByRole('status', { name: 'Import processing' })).toContainText('Extracting text');
  await expect(page.getByTestId('import-block-text')).toBeVisible();
});

test('large wordbooks parse in the background and publish all rows', async ({ page }) => {
  await page.goto('/library?import=file');
  const csv = 'word,meaning\n' + Array.from({ length: 12000 }, (_, i) => `word,meaning ${i}`).join('\n');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByText('12000 words · 0 duplicates', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import word book', exact: true }).click();
  await expect(page.getByText('Word book imported.', { exact: true })).toBeVisible({ timeout: 30000 });
  const count = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open('echotype:anonymous');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction('contents').objectStore('contents').getAll();
      request.onerror = () => { database.close(); reject(request.error); };
      request.onsuccess = () => { database.close(); resolve(request.result.filter(item => item.metadata?.vocabulary?.bookTitle === 'large').length); };
    };
  }));
  expect(count).toBe(12000);
});

test('changing files saves the current review draft', async ({ page }) => {
  await page.goto('/library?import=file');
  const first = { name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('First original.') };
  await page.getByTestId('durable-import-file').setInputFiles(first);
  await page.getByTestId('import-process').click();
  await page.getByTestId('import-block-text').fill('First corrected.');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('Second original.') });
  await expect(page.getByTestId('material-source-summary')).toContainText('second.txt');
  await expect(page.getByRole('button', { name: 'Change file', exact: true })).toBeEnabled();
  await page.getByTestId('durable-import-file').setInputFiles(first);
  await expect(page.getByTestId('import-block-text')).toHaveValue('First corrected.');
});
