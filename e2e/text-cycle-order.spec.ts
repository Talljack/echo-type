import { expect, test, type Page } from '@playwright/test';

const source = 'Our team fixed a slow API. The response time improved after adding an index.';
async function openLesson(page: Page) {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(async (text) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction('contents', 'readwrite');
      tx.objectStore('contents').put({ id: 'order-story', title: 'Order recovery story', text, type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
      tx.oncomplete = () => { database.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }), source);
  await page.goto('/learn');
  await page.getByRole('link', { name: /Order recovery story/ }).click();
  await expect(page.getByRole('navigation', { name: 'Learning cycle' })).toBeVisible();
}
async function understand(page: Page) {
  await page.getByRole('button', { name: '1. Understand', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('An index improved the API speed.');
  await page.getByRole('textbox', { name: 'Exact supporting quote from the source', exact: true }).fill('adding an index');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 / 5 stages practiced', exact: true })).toBeVisible();
}
async function rows(page: Page) {
  return page.evaluate(async () => new Promise<Array<{ answer: string; parentAttemptId?: string; usedTranslation?: boolean }>>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction('learningAttempts');
      const result = tx.objectStore('learningAttempts').getAll();
      result.onsuccess = () => resolve(result.result);
      tx.oncomplete = () => database.close();
    };
  }));
}
for (const scenario of ['early writing', 'copied first response']) {
  test(`recovers Output after ${scenario} without losing earlier evidence`, async ({ page }) => {
    await openLesson(page);
    if (scenario === 'copied first response') await understand(page);
    await page.getByRole('button', { name: '2. Output', exact: true }).click();
    const first = scenario === 'early writing' ? 'I will measure database queries.' : source;
    await page.getByRole('textbox', { name: 'Your response', exact: true }).fill(first);
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect.poll(async () => (await rows(page)).some(row => row.answer === first)).toBe(true);
    if (scenario === 'early writing') await understand(page);
    await page.reload();
    await page.getByRole('button', { name: '2. Output', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Your response', exact: true })).toHaveValue(first);
    await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('I can improve search by measuring slow database queries.');
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect(page.getByRole('heading', { name: '2 / 5 stages practiced', exact: true })).toBeVisible();
    const attempts = await rows(page);
    expect(attempts.some(row => row.answer === first)).toBe(true);
    expect(attempts.find(row => row.answer === 'I can improve search by measuring slow database queries.')?.parentAttemptId).toBeUndefined();
  });
}
test('restoring an older unassisted draft while translation is visible records assistance', async ({ page }) => {
  await page.route('**/api/translate/**', route => route.fulfill({ json: { translations: [] } }));
  await openLesson(page);
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('A database index improved the API.');
  await page.getByRole('textbox', { name: 'Exact supporting quote from the source', exact: true }).fill('adding an index');
  const toggle = page.getByRole('button', { name: 'Translation', exact: true });
  if (await toggle.getAttribute('aria-pressed') !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage).filter(key => key.startsWith('workshop-draft:v1:'))) {
      const draft = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...draft, usedTranslation: false }));
    }
  });
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('textbox', { name: 'Your response', exact: true })).toHaveValue('A database index improved the API.');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect.poll(async () => (await rows(page)).find(row => row.answer === 'A database index improved the API.')?.usedTranslation).toBe(true);
});
