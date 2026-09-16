import { expect, test, type Page } from '@playwright/test';
import { processFile, publishMaterial, resumeReview } from './helpers/material-import';

const subtitle = { name: 'lesson.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nOriginal words.') };
async function jobs(page: Page) {
  return page.evaluate(() => new Promise<any[]>((resolve, reject) => {
    const r = indexedDB.open('echotype:anonymous'); r.onerror = () => reject(r.error);
    r.onsuccess = () => { const db = r.result; const q = db.transaction('importJobs').objectStore('importJobs').getAll(); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  }));
}
async function mediaReview(page: Page) {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'voice.mp4', mimeType: 'video/mp4', buffer: Buffer.from('local-original-media') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm AI transcription', exact: true })).toBeVisible();
  await page.locator('input[accept=".srt,.vtt"]').setInputFiles(subtitle);
  await expect(page.getByTestId('v2-review-workspace')).toBeVisible();
}

test('subtitle review survives refresh, preserves original, and publishing is idempotent', async ({ page }) => {
  await page.goto('/library/import');
  await processFile(page, subtitle);
  await page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true })).fill('Corrected words.');
  await page.reload();
  await resumeReview(page);
  await expect(page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true }))).toHaveValue('Corrected words.');
  await publishMaterial(page);
  const first = (await jobs(page))[0];
  expect(first.originalText).toBe('Original words.');
  expect(first.blocks[0].text).toBe('Corrected words.');
  expect(first.materialIds).toHaveLength(1);
  await page.reload();
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.getByRole('button', { name: 'Continue adding', exact: true }).click();
  await page.getByTestId('durable-import-file').setInputFiles({ ...subtitle, name: 'same-renamed.srt' });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  expect(await jobs(page)).toHaveLength(1);
  expect((await jobs(page))[0].materialIds).toEqual(first.materialIds);
});

test('failed extraction retries after refresh without a second task and chapters retain anchors', async ({ page }, testInfo) => {
  let attempts = 0;
  await page.route('**/api/import/extract-text', route => {
    attempts++;
    return attempts === 1 ? route.fulfill({ status: 500, json: { error: 'Temporary extraction failure' } }) : route.fulfill({ json: { text: 'First.\n\nSecond.', chapters: [{ title: 'First chapter', text: 'First.' }, { title: 'Second chapter', text: 'Second.' }], metadata: { title: 'Two chapters' } } });
  });
  await page.goto('/library/import');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'book.txt', mimeType: 'text/plain', buffer: Buffer.from('First.\n\nSecond.') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Temporary extraction failure');
  await page.reload();
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByTestId('import-process').click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await page.getByRole('button', { name: /02.*Second chapter/ }).click();
  await expect(page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true }))).toHaveValue('Second.');
  const all = await jobs(page);
  expect(all).toHaveLength(1);
  expect(all[0].blocks[1]).toMatchObject({ start: 8, end: 15 });
  await publishMaterial(page);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('durable-import-375.png'), fullPage: true });
});

test('leaving a reviewed draft keeps corrections and resumes without extraction', async ({ page }) => {
  await page.goto('/library/import');
  await processFile(page, subtitle);
  await page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true })).fill('My correction.');
  await page.getByRole('button', { name: 'Back to source', exact: true }).click();
  await page.reload();
  await resumeReview(page);
  await expect(page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true }))).toHaveValue('My correction.');
});

test('paired subtitles bypass paid transcription, offset and original media survive reload', async ({ page }) => {
  let transcriptions = 0;
  await page.route('**/api/import/transcribe', route => { transcriptions++; return route.abort(); });
  await mediaReview(page);
  await page.getByText('Source & more settings', { exact: true }).click();
  await page.getByLabel('Subtitle offset (seconds)').fill('2');
  await page.reload();
  await resumeReview(page);
  await page.getByText('Source & more settings', { exact: true }).click();
  await expect(page.getByLabel('Subtitle offset (seconds)')).toHaveValue('2');
  await expect.poll(async () => (await jobs(page))[0].blocks[0]).toMatchObject({ timeStart: 3, timeEnd: 4 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('voice.mp4');
  await publishMaterial(page);
  expect(transcriptions).toBe(0);
});

test('a stale review cannot silently overwrite a newer edit from another window', async ({ page, context }) => {
  await page.goto('/library/import');
  await processFile(page, subtitle);
  const second = await context.newPage();
  await second.goto('/library/import');
  await resumeReview(second);
  await page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true })).fill('New edit.');
  await expect(page.getByTestId('import-action-bar')).toContainText('Draft saved');
  await second.getByTestId('import-block-text').or(second.getByLabel('Line 1', { exact: true })).fill('Stale edit.');
  await expect(second.getByRole('dialog').getByRole('alert')).toContainText('changed in another window');
  expect((await jobs(page))[0].blocks[0].text).toBe('New edit.');
  await second.getByRole('button', { name: 'Reload saved version (discard unsaved edits)', exact: true }).click();
  await expect(second.getByTestId('import-block-text').or(second.getByLabel('Line 1', { exact: true }))).toHaveValue('New edit.');
});

test('YouTube URLs reuse caption extraction and persist cue locations', async ({ page }) => {
  await page.route('**/api/import/youtube', route => route.fulfill({ json: { videoId: 'abc123', timeUnit: 'milliseconds', fullText: 'First. Second.', segments: [{ offset: 1000, duration: 2000, text: 'First.' }, { offset: 4000, duration: 2000, text: 'Second.' }] } }));
  await page.goto('/library?import=url');
  await page.getByLabel('Source URL').fill('https://www.youtube.com/watch?v=abc123');
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  expect((await jobs(page))[0].blocks).toMatchObject([{ timeStart: 1, timeEnd: 3 }, { timeStart: 4, timeEnd: 6 }]);
  await publishMaterial(page);
});

test('a YouTube video without public captions explains how to continue learning', async ({ page }) => {
  await page.route('**/api/import/youtube', route => route.fulfill({ status: 404, json: { code: 'no_transcript', error: 'No transcript available for this video', hint: 'Open the video, copy its transcript, then use Paste text; or upload a video file for AI transcription.' } }));
  await page.goto('/library?import=url');
  await page.getByLabel('Source URL').fill('https://www.youtube.com/watch?v=no-captions');
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  const error = page.getByRole('dialog').getByRole('alert');
  await expect(error).toContainText('No transcript available for this video');
  await expect(error).toContainText('Paste text');
});

test('a stale subtitle attachment cannot reopen a published media job', async ({ page, context }) => {
  await mediaReview(page);
  const stale = await context.newPage();
  await stale.goto('/library/import');
  await resumeReview(stale);
  await page.getByTestId('import-block-text').or(page.getByLabel('Line 1', { exact: true })).fill('Corrected sentence.');
  await publishMaterial(page);
  await stale.locator('input[accept=".srt,.vtt"]').setInputFiles(subtitle);
  await expect(stale.getByRole('dialog').getByRole('alert')).toContainText('changed in another window');
  expect((await jobs(page))[0]).toMatchObject({ status: 'ready', blocks: [{ text: 'Corrected sentence.' }] });
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await page.getByRole('link', { name: 'Locate source passage' }).first().click();
  await expect(page).toHaveURL(/block=transcript/);
  await expect(page.locator('#source-transcript')).toBeVisible();
  const sourceRegion = page.getByRole('region', { name: 'Source locations' });
  await expect(sourceRegion.getByText('Corrected sentence.', { exact: true })).toBeVisible();
  await sourceRegion.getByText('Original source', { exact: true }).click();
  await expect(sourceRegion.getByText('Original words.', { exact: true })).toBeVisible();
});
