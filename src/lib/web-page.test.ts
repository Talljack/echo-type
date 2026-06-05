import { afterEach, describe, expect, it, vi } from 'vitest';
import * as extractText from './extract-text';
import { extractFirstUrl, fetchWebPageContent, htmlToText, removeUrlFromPrompt } from './web-page';

describe('web-page helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts the first URL from a prompt', () => {
    expect(extractFirstUrl('Explain https://example.com/article in Chinese')).toBe('https://example.com/article');
  });

  it('removes the extracted URL and preserves the rest of the prompt', () => {
    expect(removeUrlFromPrompt('Explain https://example.com/article in Chinese', 'https://example.com/article')).toBe(
      'Explain in Chinese',
    );
  });

  it('extracts readable text from article-like html', () => {
    const result = htmlToText(`
      <html>
        <head><title>Sample Article</title></head>
        <body>
          <article>
            <h1>Heading</h1>
            <p>First paragraph.</p>
            <p>Second paragraph.</p>
          </article>
        </body>
      </html>
    `);

    expect(result.title).toBe('Sample Article');
    expect(result.text).toContain('Heading');
    expect(result.text).toContain('First paragraph.');
    expect(result.text).toContain('Second paragraph.');
  });

  it('rejects localhost and private network URLs', async () => {
    await expect(fetchWebPageContent('http://localhost:3000/test')).rejects.toThrow('Private or local URLs are not allowed');
    await expect(fetchWebPageContent('http://192.168.1.20/test')).rejects.toThrow('Private or local URLs are not allowed');
  });

  it('imports remote plain text files through URL import', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Line one.\n\nLine two.', {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }),
      ),
    );

    await expect(fetchWebPageContent('https://example.com/notes.txt')).resolves.toMatchObject({
      title: 'notes',
      text: 'Line one.\n\nLine two.',
      url: 'https://example.com/notes.txt',
    });
  });

  it('imports remote pdf files through URL import', async () => {
    vi.spyOn(extractText, 'extractPdf').mockResolvedValue({
      text: 'Remote PDF body',
      metadata: {
        title: 'Remote Lesson',
        author: null,
        pageCount: 1,
        format: 'pdf',
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
      ),
    );

    await expect(fetchWebPageContent('https://example.com/files/lesson.pdf')).resolves.toMatchObject({
      title: 'Remote Lesson',
      text: 'Remote PDF body',
      url: 'https://example.com/files/lesson.pdf',
    });
  });
});
