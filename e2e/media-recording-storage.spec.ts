import { expect, test } from '@playwright/test';

test('app-managed recording survives reload as bytes and restores playable media URL', async ({ page }) => {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('contents', 'readwrite');
        tx.objectStore('contents').put({ id: 'media-reliability', title: 'Recording reliability story', text: 'Our team fixed a slow API by adding an index.', type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('/learn');
  await page.getByRole('link', { name: /Recording reliability story/ }).click();
  await page.getByText('Optional focused practice', { exact: true }).click();
  await page.getByRole('button', { name: /Retelling/, exact: false }).click();
  await page.getByRole('textbox', { name: 'Summary / sentence and stress notes' }).fill('Our team improved a slow API with an index.');
  // A valid PCM WAV avoids confusing persistence verification with decoder errors.
  const audio = Buffer.alloc(44 + 1600);
  audio.write('RIFF'); audio.writeUInt32LE(audio.length - 8, 4); audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(1600, 40);
  await page.locator('input[type=file]').setInputFiles({ name: 'voice.wav', mimeType: 'audio/wav', buffer: audio });
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved.');
  const stored = await page.evaluate(async () => new Promise<{ bytes: number; nativeBlob: boolean }>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('mediaBlobs');
      const rows = tx.objectStore('mediaBlobs').getAll();
      rows.onsuccess = () => {
        const row = rows.result.find((item) => item._mediaBlobEncoding === 1);
        resolve({ bytes: row?.blob?.byteLength ?? 0, nativeBlob: row?.blob instanceof Blob });
      };
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    };
  }));
  expect(stored).toEqual({ bytes: audio.length, nativeBlob: false });
  await page.reload();
  await page.getByText('Optional focused practice', { exact: true }).click();
  await page.getByRole('button', { name: /Retelling/, exact: false }).click();
  await page.getByText('Submission history (1)', { exact: true }).click();
  const savedAudio = page.locator('audio');
  await expect(savedAudio).toHaveAttribute('src', /^blob:/);
  expect(await savedAudio.evaluate(async (node: HTMLAudioElement) => (await (await fetch(node.src)).arrayBuffer()).byteLength)).toBe(audio.length);
});
