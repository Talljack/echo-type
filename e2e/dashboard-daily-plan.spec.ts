import { expect, test } from '@playwright/test';

// Unified Today replaces generated task cards. Four-module continuation is
// covered in learning-workspace.spec.ts; legacy scheduling algorithms retain unit tests.
test.describe('Unified dashboard daily plan', () => {
  test('retains original due reviews after segmentation and shows saved practice progress', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
    await page.evaluate(async () => {
      const request = indexedDB.open('echotype:anonymous');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const now = Date.now();
      const tx = database.transaction(['contents', 'records', 'sessions'], 'readwrite');
      tx.objectStore('contents').put({ id: 'daily-source', title: 'My daily reading',
        text: 'A longer English lesson. '.repeat(200), type: 'article', source: 'imported', tags: [], createdAt: now, updatedAt: now });
      tx.objectStore('records').put({ id: 'daily-due', contentId: 'daily-source', module: 'read',
        accuracy: 70, attempts: 1, correctCount: 1, mistakes: [], lastPracticed: now - 86400000, nextReview: now - 1000 });
      for (const [id, completed] of [['saved', true], ['unfinished', false]] as const) {
        tx.objectStore('sessions').put({ id, contentId: 'daily-source', module: 'read', startTime: now,
          endTime: now, completed, totalWords: 4, accuracy: 70, totalChars: 20, correctChars: 14, wrongChars: 6, wpm: 0 });
      }
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
      database.close();
    });
    await page.reload();
    const today = page.getByTestId('today-workspace');
    await expect(today.getByRole('link', { name: 'Start today’s practice' })).toHaveAttribute('href', '/review/today');
    await expect(page.getByTestId('learning-settings').locator('summary')).toContainText('1 / 4');
    await expect(today.getByText('My daily reading', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('learning-settings').locator('summary')).toContainText('1 / 4');
  });

  test('learning focus changes targeted action without another plan', async ({ page }) => {
    await page.goto('/dashboard');
    const today = page.getByTestId('today-workspace');
    await expect(today).toBeVisible({ timeout: 30000 });
    const settings = page.getByTestId('learning-settings');
    await settings.locator('summary').click();
    for (const [focus, href] of [['Work', '/journal'], ['Exam', '/write'], ['Speaking', '/pronunciation']]) {
      await settings.getByRole('button', { name: focus, exact: true }).click();
      await expect(today.getByRole('link', { name: /03 Practice your focus/ })).toHaveAttribute('href', href);
    }
    await expect(page.getByText('Custom daily plan: goals, tasks and scheduling', { exact: true })).toHaveCount(0);
  });
});
