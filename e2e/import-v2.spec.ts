import { expect, test } from '@playwright/test';
import { publishMaterial, resumeReview } from './helpers/material-import';

test('unfinished batch vocabulary rows survive reopening and can be corrected', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles([
    { name: 'words.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,greeting\nhelpful,useful') },
    { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('Another article.') },
  ]);
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await page.getByLabel('meaning 1', { exact: true }).fill('');
  await page.reload();
  await resumeReview(page);
  await expect(page.getByLabel('word 1', { exact: true })).toHaveValue('hello');
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByLabel('meaning 1', { exact: true }).fill('a greeting');
  await publishMaterial(page);
});

test('one unsupported file does not discard the valid files in a batch', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles([
    { name: 'good.txt', mimeType: 'text/plain', buffer: Buffer.from('A valid learning article.') },
    { name: 'bad.xyz', mimeType: 'application/octet-stream', buffer: Buffer.from('bad') },
  ]);
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('bad.xyz');
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await expect(page.getByLabel('Chapter text')).toHaveValue('A valid learning article.');
  await publishMaterial(page);
});

test('a failed link can be completed with supplemental text in the same task', async ({ page }) => {
  await page.route('**/api/import/youtube', route => route.fulfill({ status: 422, json: { error: 'Could not retrieve captions' } }));
  await page.goto('/library?import=url');
  await page.getByLabel('Source URL', { exact: true }).fill('https://www.youtube.com/watch?v=DuLqmyDJPLQ');
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not retrieve captions');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Supplemental text', { exact: true }).fill('English source supplied by the learner.');
  await page.getByRole('button', { name: 'Use this text', exact: true }).click();
  await publishMaterial(page);
});
