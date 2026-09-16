import { afterEach, expect, it, vi } from 'vitest';
import { describeImportError } from './import-error';
import { fetchWebPageContent } from './web-page';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('backs off for 1s then 2s and recovers on the third request', async () => {
  vi.useFakeTimers();
  const times: number[] = [];
  const start = Date.now();
  vi.stubGlobal('fetch', async () => {
    times.push(Date.now() - start);
    return times.length < 3 ? new Response('', { status: 503 }) : new Response('Recovered', { headers: { 'content-type': 'text/plain' } });
  });
  const result = fetchWebPageContent('https://example.com/book.txt').catch(error => error);
  await vi.runAllTimersAsync();
  expect(await result).toMatchObject({ text: 'Recovered' });
  expect(times).toEqual([0, 1000, 3000]);
});

it('stops after three network failures and offers manual upload in both languages', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
  vi.stubGlobal('fetch', fetcher);
  const result = fetchWebPageContent('https://example.com/book.pdf').catch(error => error);
  await vi.runAllTimersAsync();
  const error = await result;
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(describeImportError(error)).toMatch(/automatic retries.*download.*upload/i);
  expect(describeImportError(error, true)).toMatch(/自动重试.*下载.*上传/);
});

it.each(['4', new Date(Date.now() + 4000).toUTCString()])('honors Retry-After %s before retrying', async (retryAfter) => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': retryAfter } })).mockResolvedValueOnce(new Response('OK', { headers: { 'content-type': 'text/plain' } }));
  vi.stubGlobal('fetch', fetcher);
  const result = fetchWebPageContent('https://example.com/book.txt').catch(error => error);
  await vi.advanceTimersByTimeAsync(2000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.runAllTimersAsync();
  expect(await result).toMatchObject({ text: 'OK' });
});

it('does not retry earlier than a long Retry-After or wait indefinitely', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } })));
  await expect(fetchWebPageContent('https://example.com/book.txt')).rejects.toThrow('(429)');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([400, 401, 403, 404])('does not retry permanent HTTP %s errors', async status => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
  await expect(fetchWebPageContent('https://example.com/book.txt')).rejects.toThrow(`(${status})`);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('retries a timeout but never retries explicit cancellation', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError')).mockResolvedValueOnce(new Response('OK', { headers: { 'content-type': 'text/plain' } }));
  vi.stubGlobal('fetch', fetcher);
  const result = fetchWebPageContent('https://example.com/book.txt').catch(error => error);
  await vi.runAllTimersAsync();
  expect(await result).toMatchObject({ text: 'OK' });
  fetcher.mockReset().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
  await expect(fetchWebPageContent('https://example.com/book.txt')).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('stops a persistent 503 after three requests with upload guidance', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(async () => new Response('', { status: 503 }));
  vi.stubGlobal('fetch', fetcher);
  const result = fetchWebPageContent('https://example.com/book.txt').catch(error => error);
  await vi.runAllTimersAsync();
  expect(describeImportError(await result)).toContain('Upload file');
  expect(fetcher).toHaveBeenCalledTimes(3);
});
