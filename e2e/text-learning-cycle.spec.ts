import { expect, test } from '@playwright/test';

test('text source completes understanding, correction, delayed recall and transfer without AI', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('contents', 'readwrite');
        tx.objectStore('contents').put({ id: 'text-cycle-e2e', title: 'A real team update', text: 'Our team fixed a slow API. The response time improved after adding an index.', type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
  await page.goto('/learn');
  await page.getByRole('link', { name: /A real team update/ }).click();
  await expect(page.getByRole('navigation', { name: 'Learning cycle' })).toBeVisible();
  expect(await page.getByText('Source material · show / hide', { exact: true }).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(850);
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('An index helped the team improve response time.');
  await page.getByRole('textbox', { name: 'Exact supporting quote from the source' }).fill('after adding an index');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.getByRole('button', { name: '2. Output', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('My search endpoint is slow.');
  await page.reload();
  await page.getByRole('button', { name: '2. Output', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your response', exact: true })).toHaveValue('My search endpoint is slow.');
  await page.getByRole('textbox', { name: 'My next improvement' }).fill('Include a concrete next action.');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.getByRole('button', { name: '3. Correct', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('My search endpoint is slow. I will measure queries and add an index.');
  await page.getByRole('textbox', { name: 'My next improvement' }).fill('Added a measurable next action instead of a vague complaint.');
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await expect(page.getByText('Recall scheduled', { exact: true })).toBeVisible();
  await expect(page.getByText('0 / 1 lessons complete · Your original material is preserved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save recall', exact: true })).toBeDisabled();
  // Move saved evidence into the past, exercising real due-time logic without waiting a day.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction('learningAttempts', 'readwrite');
        const store = tx.objectStore('learningAttempts'); const all = store.getAll();
        all.onsuccess = () => { for (const attempt of all.result) store.put({ ...attempt, createdAt: attempt.createdAt - 2 * 86400000, updatedAt: attempt.updatedAt - 2 * 86400000 }); };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
      }; request.onerror = () => reject(request.error);
    });
  });
  await page.reload();
  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await expect(page.getByText('Our team fixed a slow API.', { exact: true })).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Recall from memory' }).fill('The team added an index to make a slow API respond faster.');
  await page.getByRole('button', { name: 'Compare my answer', exact: true }).click();
  await page.getByRole('radio', { name: 'Good · recalled independently', exact: true }).check();
  await page.getByRole('button', { name: 'Save recall', exact: true }).click();
  await expect(page.getByText('Recall saved.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '5. Apply', exact: true }).click();
  await page.getByRole('textbox', { name: 'Expression from the source' }).fill('response time');
  await page.getByRole('textbox', { name: 'New situation' }).fill('Answering customer support requests at my shop');
  await page.getByRole('textbox', { name: 'Your new example' }).fill('Our customer support response time improved after we shared a troubleshooting guide.');
  await page.getByRole('button', { name: 'Save application', exact: true }).click();
  await expect(page.getByText('5 / 5 stages practiced', { exact: true })).toBeVisible();
  await expect(page.getByText('1 / 1 lessons complete · Your original material is preserved')).toBeVisible();
  await expect(page.getByText('Self-reviewed practice, not certified mastery.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
