import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock, resolveApiKeyMock, enforcePlatformRateLimitMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  resolveApiKeyMock: vi.fn((providerId: string) => `${providerId}-test-key`),
  enforcePlatformRateLimitMock: vi.fn(async () => ({ ok: true as const })),
}));

vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/ai-model', () => ({
  resolveApiKey: resolveApiKeyMock,
}));

vi.mock('@/lib/platform-provider', () => ({
  enforcePlatformRateLimit: enforcePlatformRateLimitMock,
}));

const { POST } = await import('./route');

function makeRequest({
  provider = 'groq',
  providerConfigs,
}: {
  provider?: string;
  providerConfigs: Record<string, unknown>;
}) {
  const formData = new FormData();
  formData.append(
    'audio',
    new File([new Uint8Array(256).fill(1)], 'recording.webm', { type: 'audio/webm' }),
  );
  formData.append('language', 'en');
  formData.append('provider', provider);
  formData.append('providerConfigs', JSON.stringify(providerConfigs));

  return new NextRequest('http://localhost/api/stt', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/stt', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    resolveApiKeyMock.mockClear();
    enforcePlatformRateLimitMock.mockClear();
  });

  it('falls back to another configured provider after a non-retryable upstream auth failure', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Forbidden' },
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered through OpenAI.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const response = await POST(
      makeRequest({
        provider: 'groq',
        providerConfigs: {
          groq: { providerId: 'groq', auth: { type: 'api-key', apiKey: 'groq-key' } },
          openai: { providerId: 'openai', auth: { type: 'api-key', apiKey: 'openai-key' } },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      text: 'Recovered through OpenAI.',
      providerId: 'openai',
      fallbackApplied: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer groq-test-key' },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer openai-test-key' },
      }),
    );
  });

  it('returns a clearer error when no fallback provider can recover the request', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: 'Forbidden' },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const response = await POST(
      makeRequest({
        provider: 'groq',
        providerConfigs: {
          groq: { providerId: 'groq', auth: { type: 'api-key', apiKey: 'groq-key' } },
        },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Groq rejected the speech recognition request. Check the API key or provider permissions in Settings.',
      providerId: 'groq',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
