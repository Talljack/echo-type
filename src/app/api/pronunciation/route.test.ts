import type { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => vi.unstubAllGlobals());

function request() {
  const body = new FormData();
  body.append('audio', new Blob(['wave'], { type: 'audio/wav' }), 'recording.wav');
  body.append('referenceText', 'ship'); body.append('appKey', 'test-key'); body.append('secretKey', 'test-secret');
  return new Request('http://localhost/api/pronunciation', { method: 'POST', body }) as NextRequest;
}

it('uses documented word endpoint and distinct app signatures, preserving missing metrics', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ result: { overall: 71, words: [{ word: 'ship', phonemes: [{ phoneme: 'ɪ', pronunciation: 44 }] }] } }));
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(request());
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.result.overall).toBe(71);
  expect(result.result).not.toHaveProperty('fluency');
  expect(result.result).not.toHaveProperty('integrity');
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe('https://api.speechsuper.com/word.eval.promax');
  const params = JSON.parse(options.body.get('text'));
  expect(params.connect.cmd).toBe('connect');
  expect(params.start.param.request.dict_type).toBe('IPA88');
  expect(params.start.param.app.sig).not.toBe(params.connect.param.app.sig);
  expect(JSON.stringify(params)).not.toContain('test-secret');
});

it('does not expose upstream credentials or manufacture assessment after failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('test-secret', { status: 401 })));
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain('test-secret');
});
