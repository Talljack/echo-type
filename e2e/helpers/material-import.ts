import { expect, type Page } from '@playwright/test';

export async function processFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByTestId('durable-import-file').setInputFiles(file);
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await expect(page.getByTestId('v2-review-workspace')).toBeVisible();
}

export async function resumeReview(page: Page) {
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).first().click();
}

export async function publishMaterial(page: Page) {
  await page.getByRole('button', { name: 'Add to library', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Start first lesson', exact: true })).toBeVisible({ timeout: 60000 });
}

export async function importWordbook(page: Page, name: string, text: string) {
  await page.goto('/library?import=file');
  await processFile(page, { name: `${name}.csv`, mimeType: 'text/csv', buffer: Buffer.from(text) });
  await page.getByLabel('Material title', { exact: true }).fill(name);
  await publishMaterial(page);
}
