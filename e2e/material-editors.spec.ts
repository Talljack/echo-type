import { expect, test } from '@playwright/test';

test('sentence review splits and merges without losing punctuation', async ({ page }) => {
  await page.goto('/library?import=text');
  await page.getByLabel('Import text content', { exact: true }).fill("That's fine! Next.");
  await page.getByRole('button', { name: 'Review material', exact: true }).click();
  await page.getByLabel('Material type', { exact: true }).selectOption('sentences');
  const sentence = page.getByLabel('Sentence 1', { exact: true });
  await sentence.focus();
  await sentence.press('Home');
  for (let i = 0; i < 12; i++) await sentence.press('ArrowRight');
  await page.getByRole('button', { name: 'Split at cursor', exact: true }).click();
  await expect(page.getByLabel('Sentence 2', { exact: true })).toHaveValue(' Next.');
  await page.getByRole('button', { name: 'Merge with next', exact: true }).first().click();
  await expect(sentence).toHaveValue("That's fine! Next.");
});

test('wordbook cells remain editable when cleared and save corrections', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'review.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning,example,pronunciation\nhello,你好,Hello!,/hello/') });
  await page.getByLabel('meaning 1', { exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Import word book', exact: true })).toBeDisabled();
  await page.getByLabel('meaning 1', { exact: true }).fill('问候');
  await page.getByLabel('example 1', { exact: true }).fill('Hello, friend!');
  await page.getByRole('button', { name: 'Import word book', exact: true }).click();
  await expect(page.getByText('Word book imported.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('invalid source rows cannot disappear through table editing', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('word,meaning\nhello,你好\nbroken,') });
  await expect(page.getByLabel('meaning 1', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Import word book', exact: true })).toBeDisabled();
  await page.getByText('Source CSV / TSV', { exact: true }).click();
  await page.getByLabel('CSV or TSV text', { exact: true }).fill('word,meaning\nhello,你好\nbroken,破损的');
  await expect(page.getByLabel('meaning 1', { exact: true })).toBeEnabled();
});
