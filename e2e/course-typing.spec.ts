import { expect, test } from '@playwright/test';

test('manual and automatic wordbook navigation cannot skip the next unanswered item', async ({ page }) => {
  await page.goto('/write/book/airport');
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await expect(input).toBeVisible();
  const target = await page.getByTestId('listen-book-sentence').textContent();
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await input.fill(target!.trim());
  await input.press('Enter');
  await expect(page.getByText(/Moving to next/)).toBeVisible();
  await page.clock.runFor(500);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.clock.runFor(400);
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(input).toHaveValue('');
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/translate/**', route => route.fulfill({ json: { translation: '词' } }));
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('echotype:anonymous'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const tx = database.transaction('contents', 'readwrite');
    ['controversy', 'evidence'].forEach((word, i) => tx.objectStore('contents').put({
      id: `typing-fixture-${i}`, category: 'typing-regression', title: word, text: word, type: 'word',
      tags: [], source: 'imported', createdAt: i + 1, updatedAt: Date.now(),
    }));
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    database.close();
  });
  await page.goto('/learn/unit%3Acategory%3Atyping-regression');
  await page.getByRole('button', { name: 'Type', exact: true }).click();
});

test('saved typing advances once to the next item and the final item offers explicit Continue', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await input.fill('Controversy');
  await input.press('Enter');
  await expect(page.getByText('Type · Item 2 of 2', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  await input.fill('evidence');
  await input.press('Enter');
  await expect(page.getByText('Correct! Practice saved.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await expect(page.getByText(/Moving to next/)).toHaveCount(0);
  await input.press('Enter');
  await expect(page.getByText('2 / 8 exercises completed', { exact: true })).toBeVisible();
  const count = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open('echotype:anonymous'); r.onsuccess = () => resolve(r.result); });
    const tx = database.transaction('sessions');
    const request = tx.objectStore('sessions').getAll();
    return new Promise<number>(resolve => { tx.oncomplete = () => { resolve(request.result.filter((s: {module: string}) => s.module === 'write').length); database.close(); }; });
  });
  expect(count).toBe(2);
});

test('word typing uses one compact editable field without a second feedback box', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await expect(input).toHaveCount(1);
  expect((await input.boundingBox())!.height).toBeLessThan(90);
  await input.fill('contro');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('button', { name: 'Close menu' })).not.toBeInViewport();
  await expect(input).toBeVisible();
  expect(await page.locator('main').last().evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await input.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/design/course-typing-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await input.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'docs/design/course-typing-desktop.png' });
});

test('leaving Type cancels its delayed advance', async ({ page }) => {
  await page.clock.install();
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await input.fill('controversy');
  await input.press('Enter');
  await expect(page.getByText(/Moving to next/)).toBeVisible();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.clock.fastForward(2000);
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Listen · Item 1 of 2', { exact: true })).toBeVisible();
});

test('failed session writes keep the answer for retry instead of announcing success or advancing', async ({ page }) => {
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'sessions') {
        IDBObjectStore.prototype.add = add;
        throw new DOMException('Test storage failure', 'QuotaExceededError');
      }
      return add.apply(this, args);
    };
  });
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await input.fill('controversy');
  await input.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Could not save practice' })).toBeVisible();
  await expect(input).toHaveValue('controversy');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await input.press('Enter');
  await expect(page.getByText('Type · Item 2 of 2', { exact: true })).toBeVisible();
});
