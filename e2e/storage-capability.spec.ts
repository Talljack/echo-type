import { expect, test } from '@playwright/test';

test('browser can persist and read a Blob without application code', async ({ page }) => {
  await page.route('**/storage-probe', route => route.fulfill({ contentType: 'text/html', body: '<title>Storage probe</title>' }));
  await page.goto('/storage-probe');
  const result = await page.evaluate(async () => {
    const request = indexedDB.open('echo-verification-storage-probe', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('media');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = database.transaction('media', 'readwrite');
      tx.objectStore('media').put(new Blob(['sample audio'], { type: 'audio/wav' }), 'recording');
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });
      const read = database.transaction('media').objectStore('media').get('recording');
      const blob = await new Promise<Blob>((resolve, reject) => {
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
      return { text: await blob.text() };
    } catch (error) {
      return { error: `${(error as Error)?.name}: ${(error as Error)?.message}` };
    } finally { database.close(); }
  });
  expect(result).toEqual({ text: 'sample audio' });
});
