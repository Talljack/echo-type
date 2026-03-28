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

  it('dispatches batch sentence translations with a bounded concurrency window', async () => {
    fetchMock.mockImplementation((url: string) => {
      return new Promise<Response>((resolve) => {
        pendingResponses.push({ url, resolve });
      });
    });

    const responsePromise = POST(
      makeRequest({
        sentences: ['First sentence.', 'Second sentence.', 'Third sentence.', 'Fourth sentence.', 'Fifth sentence.'],
        targetLang: 'zh-CN',
      }),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(pendingResponses).toHaveLength(4);

    for (const pending of pendingResponses.slice(0, 4)) {
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

    await new Promise((resolve) => setImmediate(resolve));

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(pendingResponses).toHaveLength(5);

    const lastPending = pendingResponses[4];
    if (!lastPending) {
      throw new Error('Expected fifth pending request');
    }
    const sentence = new URL(lastPending.url).searchParams.get('q') ?? '';
    lastPending.resolve(
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

    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      translations: [
        'zh:First sentence.',
        'zh:Second sentence.',
        'zh:Third sentence.',
        'zh:Fourth sentence.',
        'zh:Fifth sentence.',
      ],
      engine: 'google-free',
    });
  });

  it('surfaces upstream Google failures as dependency errors', async () => {
    fetchMock.mockResolvedValue(
      new Response('service unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const response = await POST(
      makeRequest({
        text: 'Hello world.',
        targetLang: 'zh-CN',
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Google Translate error: 503',
    });
  });
});
