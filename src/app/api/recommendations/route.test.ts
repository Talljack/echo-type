import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateTextMock, resolveProviderForCapabilityMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  resolveProviderForCapabilityMock: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: generateTextMock,
}));

vi.mock('@/lib/ai-model', () => ({
  resolveApiKey: vi.fn(() => 'test-api-key'),
  resolveModel: vi.fn(() => ({ mocked: true })),
}));

vi.mock('@/lib/platform-provider', () => ({
  enforcePlatformRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/provider-resolver', () => ({
  ProviderResolutionError: class ProviderResolutionError extends Error {
    code = 'provider_resolution_error';
  },
  resolveProviderForCapability: resolveProviderForCapabilityMock,
}));

resolveProviderForCapabilityMock.mockReturnValue({
  providerId: 'groq',
  modelId: 'mock-model',
  credentialSource: 'platform',
  fallbackApplied: false,
  fallbackReason: undefined,
  baseUrl: undefined,
  apiPath: undefined,
});

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/recommendations', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it('returns AI recommendations when the model responds with valid JSON', async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        recommendations: [
          {
            title: 'Digital Communication Basics',
            text: 'Digital communication covers email, chat, and social media.',
            type: 'sentence',
            relation: 'related topic',
          },
        ],
      }),
    });

    const response = await POST(
      makeRequest({
        content: 'Digital communication is part of daily life.',
        contentType: 'article',
        count: 1,
        provider: 'groq',
        providerConfigs: {},
        userLevel: 'B1',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      recommendations: [
        {
          title: 'Digital Communication Basics',
          text: 'Digital communication covers email, chat, and social media.',
          type: 'sentence',
          relation: 'related topic',
        },
      ],
      providerId: 'groq',
      credentialSource: 'platform',
    });
  });

  it('falls back to local recommendations when AI output is not parseable', async () => {
    generateTextMock.mockResolvedValue({
      text: 'not json at all',
    });

    const response = await POST(
      makeRequest({
        content:
          'Digital communication is part of daily life. We use email, chat, and social media to share ideas.',
        contentType: 'article',
        count: 3,
        provider: 'groq',
        providerConfigs: {},
        userLevel: 'B1',
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.localFallbackApplied).toBe(true);
    expect(data.recommendations).toHaveLength(3);
    expect(data.recommendations[0]).toMatchObject({
      title: expect.any(String),
      text: expect.any(String),
      relation: expect.any(String),
    });
  });

  it('retries transient failures and then falls back locally', async () => {
    generateTextMock.mockRejectedValue(new Error('Connection timeout to upstream provider'));

    const response = await POST(
      makeRequest({
        content: 'Practice the word resilient in a real-life sentence.',
        contentType: 'word',
        count: 2,
        provider: 'groq',
        providerConfigs: {},
        userLevel: 'B1',
      }),
    );

    expect(generateTextMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.localFallbackApplied).toBe(true);
    expect(data.localFallbackReason).toContain('timeout');
    expect(data.recommendations).toHaveLength(2);
  });
});
