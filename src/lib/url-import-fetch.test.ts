import { describe, expect, it, vi } from 'vitest';
import { fetchUrlImportResult } from './url-import-fetch';

describe('fetchUrlImportResult', () => {
  it('returns the server-side import result when the API succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            title: 'Example Domain',
            text: 'Example body',
            url: 'https://example.com',
            wordCount: 2,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await expect(fetchUrlImportResult('https://example.com', fetchMock as typeof fetch)).resolves.toEqual({
      title: 'Example Domain',
      text: 'Example body',
      url: 'https://example.com',
      wordCount: 2,
    });
  });

  it('falls back to browser-side pdf import when the server fetch fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 502 }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'PDF body text',
            pageCount: 1,
            metadata: { title: 'BBC Socialising', author: null },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await expect(
      fetchUrlImportResult(
        'https://downloads.bbc.co.uk/learningenglish/office_english/260323_OfficeEnglish_socialising_transcript_.pdf',
        fetchMock as typeof fetch,
      ),
    ).resolves.toEqual({
      title: 'BBC Socialising',
      text: 'PDF body text',
      url: 'https://downloads.bbc.co.uk/learningenglish/office_english/260323_OfficeEnglish_socialising_transcript_.pdf',
      wordCount: 3,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://downloads.bbc.co.uk/learningenglish/office_english/260323_OfficeEnglish_socialising_transcript_.pdf',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining('application/pdf'),
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/import/pdf',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    );
  });

  it('falls back to browser-side text import when the server fetch fails for direct text files', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'fetch failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('Alpha\n\nBeta', {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }),
      );

    await expect(
      fetchUrlImportResult('https://gist.githubusercontent.com/user/raw/example.txt', fetchMock as typeof fetch),
    ).resolves.toEqual({
      title: 'example',
      text: 'Alpha\n\nBeta',
      url: 'https://gist.githubusercontent.com/user/raw/example.txt',
      wordCount: 2,
    });
  });
});
