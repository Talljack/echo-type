import { generateWithAI } from '../ai';
import { importFromPDF } from '../pdf';
import { importFromUrl, importFromYouTube } from '../url';

describe('unsupported import paths', () => {
  it('returns unsupported for url import', async () => {
    await expect(importFromUrl('https://example.com')).resolves.toEqual(
      expect.objectContaining({ success: false }),
    );
  });

  it('returns unsupported for youtube import', async () => {
    await expect(importFromYouTube('https://youtu.be/demo')).resolves.toEqual(
      expect.objectContaining({ success: false }),
    );
  });

  it('returns unsupported for pdf import', async () => {
    await expect(importFromPDF()).resolves.toEqual(expect.objectContaining({ success: false }));
  });

  it('returns unsupported for ai generation', async () => {
    await expect(
      generateWithAI({ topic: 'Travel', difficulty: 'beginner', length: 'short', language: 'en' }),
    ).resolves.toEqual(expect.objectContaining({ success: false }));
  });
});
