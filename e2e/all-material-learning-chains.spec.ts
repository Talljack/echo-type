import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Real import and persistence; only the review clock is advanced in this isolated test database.
for (const type of ['reading', 'dialogue', 'sentences', 'scenario', 'video']) {
  test(`imported ${type} completes all five learning stages and retains progress`, async ({ page }) => {
    if (type === 'video') {
      const file = path.join(mkdtempSync(path.join(tmpdir(), 'echo-chain-')), 'lesson.mp4');
      execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file], { stdio: 'ignore' });
      await page.goto('/library?import=file');
      await page.getByTestId('durable-import-file').setInputFiles(file);
      await page.getByRole('button', { name: 'Start processing', exact: true }).click();
      await page.locator('input[accept=".srt,.vtt"]').setInputFiles({ name: 'lesson.srt', mimeType: 'text/plain', buffer: Buffer.from('1\n00:00:00,000 --> 00:00:03,000\nOur team fixed a slow API. The response time improved after adding an index.') });
    } else {
    await page.goto('/library?import=text');
    await page.getByRole('textbox', { name: 'Your text', exact: true }).fill(
      type === 'dialogue'
        ? 'Mia: Our team fixed a slow API.\nLeo: The response time improved after adding an index.'
        : 'Our team fixed a slow API. The response time improved after adding an index.',
    );
    await page.getByRole('button', { name: 'Review content', exact: true }).click();
    }
    page.on('dialog', dialog => dialog.accept());
    await page.getByLabel('Material type', { exact: true }).selectOption(type);
    if (type === 'scenario') {
      await page.getByLabel('Your role', { exact: true }).fill('Engineer');
      await page.getByLabel('Communication goal', { exact: true }).fill('Explain the team update');
    }
    await page.getByLabel('Material title', { exact: true }).fill(`Full chain ${type}`);
    await page.getByRole('button', { name: 'Add to library', exact: true }).click();
    await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Learning cycle' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('An index helped the team improve response time.');
    await page.getByRole('textbox', { name: 'Exact supporting quote from the source' }).fill('after adding an index');
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
    await page.getByRole('button', { name: '2. Output', exact: true }).click();
    await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('My search endpoint is slow.');
    await page.getByRole('textbox', { name: 'My next improvement' }).fill('Include a concrete next action.');
    await page.getByRole('button', { name: 'Save response', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
    await page.getByRole('button', { name: '3. Correct', exact: true }).click();
    await page.getByRole('textbox', { name: 'Your response', exact: true }).fill('My search endpoint is slow. I will measure queries and add an index.');
    await page.getByRole('textbox', { name: 'My next improvement' }).fill('Added a measurable next action.');
    await page.getByRole('button', { name: 'Save revision', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();
    await page.getByRole('button', { name: '4. Recall', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save recall', exact: true })).toBeDisabled();
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('echotype:anonymous');
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('learningAttempts', 'readwrite');
          const store = tx.objectStore('learningAttempts');
          const all = store.getAll();
          all.onsuccess = () => {
            for (const a of all.result) store.put({ ...a, createdAt: a.createdAt - 172800000, updatedAt: a.updatedAt - 172800000 });
          };
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    });
    await page.reload();
    await page.getByRole('button', { name: '4. Recall', exact: true }).click();
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
    await page.reload();
    await expect(page.getByText('5 / 5 stages practiced', { exact: true })).toBeVisible();
  });
}
