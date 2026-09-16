import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('imports an EPUB below the documented document size limit', async ({ request }) => {
  const epubPath = path.resolve(process.cwd(), 'test-data/little-prince.epub');
  const response = await request.post('/api/import/extract-text', {
    multipart: {
      file: {
        name: 'little-prince.epub',
        mimeType: 'application/epub+zip',
        buffer: fs.readFileSync(epubPath),
      },
    },
  });

  expect(response.ok()).toBe(true);
  const imported = await response.json();
  expect(imported.metadata.format).toBe('epub');
  expect(imported.chapters.length).toBeGreaterThanOrEqual(27);
  expect(imported.wordCount).toBeGreaterThan(10_000);
});
