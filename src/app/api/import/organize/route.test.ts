import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), key: vi.fn(), limit: vi.fn(), provider: vi.fn() }));
vi.mock('ai', async (importOriginal) => ({...await importOriginal<typeof import('ai')>(), generateText: mocks.generate }));
vi.mock('@/lib/ai-model', () => ({ resolveApiKey: mocks.key, resolveModel: () => ({}) }));
vi.mock('@/lib/provider-resolver', () => ({ resolveProviderForCapability: mocks.provider }));
vi.mock('@/lib/platform-provider', () => ({ enforcePlatformRateLimit: mocks.limit }));
import { POST } from './route';

const request = (target = 'sentences', text = 'Book a room for two nights.') =>
  new NextRequest('http://localhost/api/import/organize', { method: 'POST', body: JSON.stringify({ target, text }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.provider.mockReturnValue({providerId:'openai'});
  mocks.key.mockReturnValue('test-key');
  mocks.limit.mockResolvedValue({ ok: true });
  mocks.generate.mockResolvedValue({ text: JSON.stringify({ title: 'Hotel', sentences: ['Book a room for two nights.'] }) });
});

it('rejects empty, oversized and unsupported requests before contacting AI', async () => {
  for (const req of [request('audio'), request('sentences', ''), request('sentences', 'x'.repeat(30001))])
    expect((await POST(req)).status).toBe(400);
  expect(mocks.generate).not.toHaveBeenCalled();
});

it('returns validated sentences', async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).sentences).toEqual(['Book a room for two nights.']);
});
it('requests schema-constrained output from local Ollama',async()=>{
 mocks.provider.mockReturnValue({providerId:'ollama'});
 expect((await POST(request())).status).toBe(200);
 expect(mocks.generate.mock.calls[0][0].output).toBeDefined();
});

it('rejects an incomplete scenario instead of publishing it', async () => {
  expect((await POST(request('scenario'))).status).toBe(422);
});

it('requires provider access and respects rate limits', async () => {
  mocks.key.mockReturnValue('');
  expect((await POST(request())).status).toBe(401);
  mocks.key.mockReturnValue('test-key');
  mocks.limit.mockResolvedValue({ ok: false, message: 'Limit reached', retryAfterSeconds: 60 });
  expect((await POST(request())).status).toBe(429);
  expect(mocks.generate).not.toHaveBeenCalled();
});

it('fails safely on provider errors', async () => {
  mocks.generate.mockRejectedValue(new Error('offline'));
  expect((await POST(request())).status).toBe(503);
});
