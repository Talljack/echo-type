import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type PendingResponse = {
  url: string;
  resolve: (response: Response) => void;
};

const fetchMock = vi.fn();
const pendingResponses: PendingResponse[] = [];

vi.stubGlobal('fetch', fetchMock);

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/translate/free', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/translate/free', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    pendingResponses.length = 0;
  });

  it('dispatches batch sentence translations in parallel', async () => {
    fetchMock.mockImplementation((url: string) => {
      return new Promise<Response>((resolve) => {
        pendingResponses.push({ url, resolve });
      });
    });

    const responsePromise = POST(
      makeRequest({
        sentences: ['First sentence.', 'Second sentence.', 'Third sentence.'],
        targetLang: 'zh-CN',
      }),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(pendingResponses).toHaveLength(3);

    for (const pending of pendingResponses) {
      const sentence = new URL(pending.url).searchParams.get('q') ?? '';
      pending.resolve(
        new Response(
          JSON.stringify({
            sentences: [{ trans: `zh:${sentence}` }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    }

    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      translations: ['zh:First sentence.', 'zh:Second sentence.', 'zh:Third sentence.'],
      engine: 'google-free',
    });
  });
});
