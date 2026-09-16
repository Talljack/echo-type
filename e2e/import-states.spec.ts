import { expect, test } from '@playwright/test';
import { processFile, publishMaterial, resumeReview } from './helpers/material-import';

test('invalid replacement wordbook preserves the existing draft', async ({ page }) => {
  await page.goto('/library?import=file');
  await processFile(page, { name: 'keep.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,greeting') });
  await page.getByRole('button', { name: 'Back to source', exact: true }).click();
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'bad.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('bad') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Unsupported format');
  await page.reload();
  await resumeReview(page);
  await expect(page.getByLabel('word 1', { exact: true })).toHaveValue('hello');
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
        document.documentElement.dataset.importStarted = 'yes';
        init?.signal?.addEventListener('abort', () => { document.documentElement.dataset.importAborted = 'yes'; reject(new DOMException('Aborted', 'AbortError')); });
      });
      return original(input, init);
    };
  });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'cancel.txt', mimeType: 'text/plain', buffer: Buffer.from('Original to keep.') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-import-started', 'yes');
  await page.getByRole('button', { name: 'Cancel task (keep original)', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-import-aborted', 'yes');
  await expect(page.getByTestId('import-process')).toBeEnabled();
  const original = await page.evaluate(() => new Promise<string>((resolve, reject) => {
    const r = indexedDB.open('echotype:anonymous');
    r.onsuccess = () => {
      const db = r.result; const q = db.transaction('importJobs').objectStore('importJobs').getAll();
      q.onsuccess = () => { db.close(); resolve(q.result[0].filename); }; q.onerror = () => reject(q.error);
    }; r.onerror = () => reject(r.error);
  }));
  expect(original).toBe('cancel.txt');
});

test('text review survives refresh without manual saving', async ({ page }) => {
  await page.goto('/library?import=text');
  await page.getByLabel('Your text').fill('My original English paragraph.');
  await page.getByRole('button', { name: 'Review content', exact: true }).click();
  await page.getByLabel('Material title').fill('Recovered title');
  await page.reload();
  await resumeReview(page);
  await expect(page.getByLabel('Material title')).toHaveValue('Recovered title');
  await expect(page.getByTestId('import-publish')).toBeEnabled();
});

test('wordbook review can be resumed after refresh', async ({ page }) => {
  await page.goto('/library?import=file');
  await processFile(page, { name: 'restore.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,greeting') });
  await page.reload();
  await resumeReview(page);
  await expect(page.getByLabel('word 1', { exact: true })).toHaveValue('hello');
});

test('file edits autosave before reopening the saved task', async ({ page }) => {
  await page.goto('/library?import=file');
  await processFile(page, { name: 'auto.txt', mimeType: 'text/plain', buffer: Buffer.from('Original.') });
  await page.getByTestId('import-block-text').fill('Automatically saved correction.');
  await page.reload();
  await resumeReview(page);
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
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('button', { name: /Review ready material/ })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open', exact: true })).toHaveCount(1);
});

test('file review replaces the drop zone with a content-first workspace', async ({ page }) => {
  await page.goto('/library?import=file');
  await expect(page.getByTestId('material-drop-zone')).toBeVisible();
  await processFile(page, { name: 'review.txt', mimeType: 'text/plain', buffer: Buffer.from('English practice.') });
  await expect(page.getByTestId('material-drop-zone')).toHaveCount(0);
  await expect(page.getByTestId('import-block-text')).toHaveValue('English practice.');
  await expect(page.getByTestId('v2-review-workspace')).toBeVisible();
});

test('processing explains its current stage without invented percentages', async ({ page }) => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/api/import/extract-text', async route => {
    await pending;
    await route.fulfill({ json: { text: 'English practice.', metadata: {} } });
  });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'slow.txt', mimeType: 'text/plain', buffer: Buffer.from('English practice.') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  try {
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Extracting text');
  } finally { finish(); }
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await expect(page.getByTestId('import-block-text')).toBeVisible();
});

test('large wordbooks parse in the background and publish all rows', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/library?import=file');
  const csv = 'word,meaning\n' + Array.from({ length: 12000 }, (_, i) => `word,meaning ${i}`).join('\n');
  await processFile(page, { name: 'large.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await publishMaterial(page);
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
  await processFile(page, { name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('First original.') });
  await page.getByTestId('import-block-text').fill('First corrected.');
  await page.getByRole('button', { name: 'Back to source', exact: true }).click();
  await processFile(page, { name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('Second original.') });
  await page.reload();
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).last().click();
  await expect(page.getByTestId('import-block-text')).toHaveValue('First corrected.');
});
