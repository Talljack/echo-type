import { expect, test } from '@playwright/test';

async function seedChatContent(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('contents', 'readwrite');
        const store = transaction.objectStore('contents');
        const now = Date.now();
        store.put({
          id: 'chat-workflow-word',
          title: 'resilient',
          text: 'able to recover quickly from difficulties',
          type: 'word',
          tags: ['e2e'],
          source: 'imported',
          createdAt: now,
          updatedAt: now,
        });
        store.put({
          id: 'chat-workflow-phrase',
          title: 'take initiative',
          text: 'to act without waiting for someone else',
          type: 'phrase',
          tags: ['e2e'],
          source: 'imported',
          createdAt: now,
          updatedAt: now,
        });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  });
}

test('chat selects and searches learning material across navigation', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.abort());
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15_000 });
  await seedChatContent(page);
  await page.reload();
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Open AI chat' }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByText('Library', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Search content...').fill('resilient');
  await page
    .getByText('resilient', { exact: true })
    .locator('..')
    .locator('..')
    .getByRole('button', { name: 'Use', exact: true })
    .click();
  await expect(page.getByText('Practicing:', { exact: true })).toBeVisible();
  await expect(page.getByText('resilient', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder('Search wordbooks, content...').fill('take initiative');
  await page.getByRole('button', { name: 'Use', exact: true }).click();
  await expect(page.getByText('take initiative', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Learning materials' }).click();
  await expect(page.getByTestId('chat-panel')).toBeVisible();
  await expect(page.getByText('Practicing:', { exact: true })).toBeVisible();
  await expect(page.getByText('take initiative', { exact: true })).toBeVisible();
});
