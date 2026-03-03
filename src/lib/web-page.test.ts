import { describe, expect, it } from 'vitest';
import { extractFirstUrl, fetchWebPageContent, htmlToText, removeUrlFromPrompt } from './web-page';

describe('web-page helpers', () => {
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
});
