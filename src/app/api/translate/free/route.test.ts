import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type PendingResponse = {
  url: string;
  resolve: (response: Response) => void;
};

const fetchMock = vi.fn();
const pendingResponses: PendingResponse[] = [];

vi.stubGlobal('fetch', fetchMock);

let POST: typeof import('./route').POST;

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/translate/free', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/translate/free', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import('./route'));
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
  it('reuses successful translations across requests', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ sentences: [{ trans: '你好' }] })));
    await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    const response = await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    expect(await response.json()).toEqual({ translation: '你好', engine: 'google-free' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces identical in-flight requests', async () => {
    let resolve: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    const first = POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    const second = POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    await new Promise(done => setImmediate(done));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(new Response(JSON.stringify({ sentences: [{ trans: '你好' }] })));
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
  });

  it('honors Google rate limiting without repeating requests during Retry-After', async () => {
    fetchMock.mockResolvedValue(new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } }));
    const first = await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    expect(first.status).toBe(429);
    expect(first.headers.get('Retry-After')).toBe('60');
    expect(await first.json()).toMatchObject({ code: 'translation_rate_limited' });
    const second = await POST(makeRequest({ text: 'Another sentence.', targetLang: 'zh-CN' }));
    expect(second.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bounds concurrent Google requests across separate API calls', async () => {
    fetchMock.mockImplementation((url: string) => new Promise<Response>(resolve => { pendingResponses.push({ url, resolve }); }));
    const responses = Array.from({ length: 5 }, (_, index) => POST(makeRequest({ text: `Request ${index}`, targetLang: 'zh-CN' })));
    await new Promise(done => setImmediate(done));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const pending of pendingResponses.slice(0, 4)) pending.resolve(new Response(JSON.stringify({ sentences: [{ trans: '译文' }] })));
    await new Promise(done => setImmediate(done));
    expect(fetchMock).toHaveBeenCalledTimes(5);
    pendingResponses[4].resolve(new Response(JSON.stringify({ sentences: [{ trans: '译文' }] })));
    expect((await Promise.all(responses)).every(response => response.status === 200)).toBe(true);
  });

  it('serves cached translations even during rate limiting', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sentences: [{ trans: '你好' }] })))
      .mockResolvedValueOnce(new Response('rate limit', { status: 429 }));
    await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    await POST(makeRequest({ text: 'New sentence.', targetLang: 'zh-CN' }));
    const cached = await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    expect(cached.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache empty responses as successful translations', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sentences: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sentences: [{ trans: '你好' }] })));
    expect((await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }))).status).toBe(502);
    expect((await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resumes translation once the rate-limit delay has expired', async () => {
    let now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      fetchMock.mockResolvedValueOnce(new Response('rate limit', { status: 429, headers: { 'Retry-After': '1' } }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ sentences: [{ trans: '你好' }] })));
      expect((await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }))).status).toBe(429);
      now += 1001;
      expect((await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }))).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally { clock.mockRestore(); }
  });

  it('honors a long upstream Retry-After value', async () => {
    fetchMock.mockResolvedValue(new Response('rate limit', { status: 429, headers: { 'Retry-After': '3600' } }));
    const response = await POST(makeRequest({ text: 'Hello.', targetLang: 'zh-CN' }));
    expect(response.headers.get('Retry-After')).toBe('3600');
  });

});
