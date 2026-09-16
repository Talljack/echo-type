import { expect, test } from '@playwright/test';
import { processFile, publishMaterial, resumeReview } from './helpers/material-import';

test('sentence review preserves punctuation and edited lines after reopening', async ({ page }) => {
  await page.goto('/library?import=text');
  await page.getByLabel('Your text', { exact: true }).fill("That's fine!\nNext.");
  await page.getByRole('button', { name: 'Review content', exact: true }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Material type', { exact: true }).selectOption('sentences');
  await page.getByLabel('Line 1', { exact: true }).fill("That's great!");
  await expect(page.getByLabel('Line 2', { exact: true })).toHaveValue('Next.');
  await page.reload();
  await resumeReview(page);
  await expect(page.getByLabel('Line 1', { exact: true })).toHaveValue("That's great!");
  await publishMaterial(page);
});

test('wordbook cells remain editable when cleared and save corrections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/library?import=file');
  await processFile(page, { name: 'review.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning,example,pronunciation\nhello,你好,Hello!,/hello/') });
  await page.getByLabel('meaning 1', { exact: true }).fill('');
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByLabel('meaning 1', { exact: true }).fill('问候');
  await page.getByLabel('example 1', { exact: true }).fill('Hello, friend!');
  await publishMaterial(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invalid source rows cannot disappear through table editing', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,你好\nbroken,') });
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: /Review ready material/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.getByLabel('Supplemental text').fill('word,meaning\nhello,你好\nbroken,破损的');
  await page.getByRole('button', { name: 'Use this text', exact: true }).click();
  await expect(page.getByLabel('word 2', { exact: true })).toHaveValue('broken');
  await expect(page.getByLabel('meaning 2', { exact: true })).toHaveValue('破损的');
  await publishMaterial(page);
});
