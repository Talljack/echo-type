import { expect, test } from '@playwright/test';

test('activity stays readable and bounded on desktop and phone', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction(['sessions', 'contents'], 'readwrite');
    tx.objectStore('contents').put({ id: 'fixture', title: 'Activity fixture', text: 'Hello.', type: 'sentence', tags: [], source: 'imported', createdAt: Date.now(), updatedAt: Date.now() });
    // The existing summary range ends yesterday; preserve that contract here.
    const startTime = Date.now() - 86400000;
    tx.objectStore('sessions').put({ id: 'activity-layout-fixture', contentId: 'fixture', module: 'write', startTime, endTime: startTime + 60000, completed: true, accuracy: 100, wpm: 25, totalWords: 25, correctWords: 25, mistakes: [] });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    database.close();
  });
  await page.reload();
  const summary = page.getByTestId('activity-summary');
  await expect(summary).toContainText('Last 8 weeks');
  await expect(summary).toContainText('Active days: 1');
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    if (width < 768) {
      await expect(page.locator('aside')).not.toBeInViewport();
    }
    const card = page.getByTestId('mini-analytics').locator('[data-slot="card"]').first();
    await card.scrollIntoViewIfNeeded();
    expect((await card.boundingBox())!.width).toBeLessThanOrEqual(416);
    const cell = summary.locator('[title]').filter({ hasNot: page.locator('time') }).last();
    const box = (await cell.boundingBox())!;
    expect(box.width).toBeGreaterThan(15);
    expect(box.width).toBeLessThanOrEqual(28.1);
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await card.screenshot({ path: `docs/design/activity-${width}.png` });
  }
});
