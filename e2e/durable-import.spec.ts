import { expect, test } from '@playwright/test';

test('subtitle review survives refresh, preserves original, and publishing is idempotent', async ({ page }) => {
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'lesson.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nOriginal words.') });
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-block-text').first()).toHaveValue('Original words.');
  await page.getByTestId('import-block-text').first().fill('Corrected words.');
  await page.getByTestId('import-save-review').click();
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').first().click();
  await expect(page.getByTestId('import-block-text').first()).toHaveValue('Corrected words.');
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').first().click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  const result = await page.evaluate(async () => new Promise<{ text: string; original: string; count: number }>((resolve) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['importJobs', 'contents']);
      const jobs = tx.objectStore('importJobs').getAll();
      const contents = tx.objectStore('contents').getAll();
      tx.oncomplete = () => {
        const items = contents.result.filter((item) => item.metadata?.importJobId === jobs.result[0].id);
        resolve({ text: items[0].text, original: jobs.result[0].originalText, count: items.length }); db.close();
      };
    };
  }));
  expect(result).toEqual({ text: 'Corrected words.', original: 'Original words.', count: 1 });
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'same-renamed.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nOriginal words.') });
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect(page.getByTestId('import-resume')).toHaveCount(1);
});

test('failed extraction retries after refresh without a second task and chapters retain anchors', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/import/extract-text', (route) => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 500, json: { error: 'Temporary extraction failure' } }) : route.fulfill({ json: { text: 'First.\n\nSecond.', chapters: [{ title: 'First chapter', text: 'First.' }, { title: 'Second chapter', text: 'Second.' }], metadata: { title: 'Two chapters' } } });
  });
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'book.txt', mimeType: 'text/plain', buffer: Buffer.from('First.\n\nSecond.') });
  await page.getByTestId('import-process').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Temporary extraction failure' })).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').click();
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-block-text')).toHaveCount(2);
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Source locations' }).getByText('Original characters 8–15')).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.getByRole('button', { name: 'Close menu' }).evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('main').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }))).toEqual(expect.objectContaining({ scroll: 375, client: 375 }));
  expect(await page.getByRole('region', { name: 'Resumable import', exact: true }).evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: '/tmp/echotype-durable-import-375.png', fullPage: true });
});

test('cancelling a reviewed draft keeps corrections and resumes without extraction', async ({ page }) => {
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'draft.srt', mimeType: 'text/plain', buffer: Buffer.from('00:01.000 --> 00:02.000\nOriginal.') });
  await page.getByTestId('import-process').click();
  await page.getByTestId('import-block-text').fill('My correction.');
  await page.getByRole('button', { name: 'Cancel task (keep original)' }).click();
  await expect(page.getByRole('button', { name: 'Continue review' })).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').click();
  await page.getByRole('button', { name: 'Continue review' }).click();
  await expect(page.getByTestId('import-block-text')).toHaveValue('My correction.');
});

test('paired subtitles bypass paid transcription, offset and original media survive reload', async ({ page }) => {
  let transcriptions = 0;
  await page.route('**/api/import/transcribe', (route) => { transcriptions++; return route.abort(); });
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'voice.wav', mimeType: 'audio/wav', buffer: Buffer.from('local-original-media') });
  await page.getByLabel('Use an SRT/VTT transcript instead of transcribing').setInputFiles({ name: 'voice.vtt', mimeType: 'text/vtt', buffer: Buffer.from('WEBVTT\n\n00:01.000 --> 00:02.000\nHello.') });
  await page.getByLabel('Subtitle offset (seconds)').fill('2');
  await page.getByTestId('import-save-review').click();
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').click();
  await expect(page.getByLabel('Subtitle offset (seconds)')).toHaveValue('2');
  await expect(page.getByText('3.00–4.00s')).toBeVisible();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  expect(transcriptions).toBe(0);
});

test('a stale review cannot silently overwrite a newer edit from another window', async ({ page, context }) => {
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'conflict.srt', mimeType: 'text/plain', buffer: Buffer.from('00:01.000 --> 00:02.000\nOriginal.') });
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-block-text')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/library/import');
  await second.getByTestId('import-resume').click();
  await page.getByTestId('import-block-text').fill('New edit.');
  await page.getByTestId('import-save-review').click();
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await second.getByTestId('import-block-text').fill('Stale edit.');
  await second.getByTestId('import-save-review').click();
  await expect(second.getByRole('alert').filter({ hasText: 'changed in another window' })).toBeVisible();
  await second.getByRole('button', { name: 'Cancel task (keep original)' }).click();
  await expect(second.getByRole('alert').filter({ hasText: 'changed in another window' })).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').click();
  await expect(page.getByTestId('import-block-text')).toHaveValue('New edit.');
});

test('YouTube URLs reuse caption extraction and persist cue locations', async ({ page }) => {
  await page.route('**/api/import/youtube', (route) => route.fulfill({ json: { videoId: 'abc123', fullText: 'First. Second.', segments: [{ offset: 1, duration: 2, text: 'First.' }, { offset: 4, duration: 2, text: 'Second.' }] } }));
  await page.goto('/library/import');
  await page.getByLabel('Source URL').fill('https://www.youtube.com/watch?v=abc123');
  await page.getByRole('button', { name: 'Add URL', exact: true }).click();
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-block-text')).toHaveCount(2);
  await expect(page.getByText('1.00–3.00s')).toBeVisible();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
});

test('a stale subtitle attachment cannot reopen a published media job', async ({ page, context }) => {
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'protected.wav', mimeType: 'audio/wav', buffer: Buffer.from('media-original') });
  const subtitle = { name: 'protected.srt', mimeType: 'text/plain', buffer: Buffer.from('00:01.000 --> 00:02.000\nOriginal sentence.') };
  await page.getByLabel('Use an SRT/VTT transcript instead of transcribing').setInputFiles(subtitle);
  await expect(page.getByTestId('import-block-text')).toBeVisible();
  const stale = await context.newPage();
  await stale.goto('/library/import');
  await stale.getByTestId('import-resume').click();
  await page.getByTestId('import-block-text').fill('Corrected sentence.');
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await stale.getByLabel('Use an SRT/VTT transcript instead of transcribing').setInputFiles(subtitle);
  await expect(stale.getByRole('alert').filter({ hasText: 'changed in another window' })).toBeVisible();
  await page.reload();
  await page.getByTestId('import-resume').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.getByRole('link', { name: 'Open my courses' }).click();
  await page.getByRole('link', { name: /protected/ }).first().click();
  await page.getByRole('link', { name: 'Locate source passage' }).first().click();
  await expect(page).toHaveURL(/block=transcript/);
  await expect(page.locator('#source-transcript')).toBeVisible();
  const sourceRegion = page.getByRole('region', { name: 'Source locations' });
  await expect(sourceRegion.getByText('Corrected sentence.', { exact: true })).toBeVisible();
  await sourceRegion.getByText('Original source', { exact: true }).click();
  await expect(sourceRegion.getByText('Original sentence.', { exact: true })).toBeVisible();
});
