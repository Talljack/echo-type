import { expect, test, type Page } from '@playwright/test';

const sourceText = 'Our team fixed a slow API. The response time improved after adding an index.';
async function openFixture(page: Page, due = false) {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(async (text) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('contents', 'readwrite');
        tx.objectStore('contents').put({ id: 'recovery-story', title: 'Draft recovery story', text, type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, sourceText);
  await page.goto('/learn');
  await page.getByRole('link', { name: /Draft recovery story/ }).click();
  await expect(page.getByRole('navigation', { name: 'Learning cycle' })).toBeVisible();
  if (!due) return;
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['lessons', 'learningAttempts'], 'readwrite');
      const lessons = tx.objectStore('lessons').getAll();
      lessons.onsuccess = () => {
        const lesson = lessons.result.find((row) => row.exercises.some((item: { id: string; metadata?: { lessonSourceId?: string } }) => item.id === 'recovery-story' || item.metadata?.lessonSourceId === 'recovery-story'));
        const time = Date.now() - 3 * 86400000;
        const common = { lessonId: lesson.id, unitId: lesson.unitId, sourceText: lesson.exercises.map((item: { text: string }) => item.text).join('\n\n'), sourceContentIds: ['recovery-story'], prompt: 'Practice', updatedAt: time, status: 'submitted', feedback: { source: 'self', notes: 'Added an action.', checklist: [] } };
        const store = tx.objectStore('learningAttempts');
        store.put({ ...common, id: 'recovery-understand', activity: 'comprehension', answer: 'The team improved API speed.', evidenceQuote: 'adding an index', createdAt: time });
        store.put({ ...common, id: 'recovery-output', activity: 'writing', answer: 'I need faster search.', createdAt: time + 1 });
        store.put({ ...common, id: 'recovery-correct', activity: 'writing', answer: 'I need faster search, so I will measure queries.', parentAttemptId: 'recovery-output', status: 'revised', createdAt: time + 2 });
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload();
}

test('recall comparison stays assisted after reload instead of allowing a fresh unassisted answer', async ({ page }) => {
  await openFixture(page, true);
  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await page.getByRole('textbox', { name: 'Recall from memory' }).fill('The team improved API performance with an index.');
  await page.getByRole('button', { name: 'Compare my answer', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Recall from memory' })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await expect(page.getByText(/This remains assisted practice/)).toBeVisible();
  const compare = page.getByRole('button', { name: 'Compare my answer', exact: true });
  if (await compare.isVisible()) await compare.click();
  await page.getByRole('radio', { name: 'Good · recalled independently', exact: true }).check();
  await page.getByRole('button', { name: 'Save recall', exact: true }).click();
  await expect(page.getByText('Recall saved.', { exact: false })).toBeVisible();
  const assisted = await page.evaluate(async () => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('learningAttempts');
      const rows = tx.objectStore('learningAttempts').getAll();
      rows.onsuccess = () => resolve(rows.result.find((row) => row.cycle?.stage === 'recall')?.cycle.assisted === true);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    };
  }));
  expect(assisted).toBe(true);
});

test('translation-only toggles persist assistance before leaving the page', async ({ page }) => {
  await page.route('**/api/translate/**', (route) => route.fulfill({ json: { translations: [] } }));
  await openFixture(page);
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('An index made the API faster.');
  const translation = page.getByRole('button', { name: 'Translation', exact: true });
  if (await translation.getAttribute('aria-pressed') === 'true') await translation.click();
  await translation.click();
  await expect(translation).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith('workshop-draft:v1:'))
    .map((key) => JSON.parse(localStorage.getItem(key)!))
    .find((row) => row.answer === 'An index made the API faster.')?.usedTranslation)).toBe(true);
  await translation.click();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Your response', exact: true })).toHaveValue('An index made the API faster.');
  expect(await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith('workshop-draft:v1:'))
    .map((key) => JSON.parse(localStorage.getItem(key)!))
    .find((row) => row.answer === 'An index made the API faster.')?.usedTranslation)).toBe(true);
});

test('an active source revision never inherits or overwrites the previous source draft', async ({ page }) => {
  await openFixture(page);
  const response = page.getByRole('textbox', { name: 'Your response', exact: true });
  await response.fill('Keep this answer only with the original source.');
  const changed = 'The school planted trees beside the playground.';
  await page.evaluate(async (text) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('contents', 'readwrite');
        const store = tx.objectStore('contents');
        const row = store.get('recovery-story');
        row.onsuccess = () => store.put({ ...row.result, text, updatedAt: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
    // Notify the real Dexie live query after a native test-fixture update, like a second tab.
    window.dispatchEvent(new CustomEvent('x-storagemutated-1', { detail: {
      'idb://echotype:anonymous/contents/': { from: 'recovery-story', to: 'recovery-story', d: 1 },
    } }));
  }, changed);
  await expect(page.getByText(changed, { exact: true })).toBeVisible();
  await expect(response).toHaveValue('');
  const drafts = await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith('workshop-draft:v1:'))
    .map((key) => JSON.parse(localStorage.getItem(key)!)));
  expect(drafts.find((row) => row.source === sourceText)?.answer).toBe('Keep this answer only with the original source.');
  expect(drafts.find((row) => row.source === changed)?.answer ?? '').toBe('');
});
