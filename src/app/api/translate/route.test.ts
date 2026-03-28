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
  credentialSource: 'configured',
  fallbackApplied: false,
  fallbackReason: undefined,
  baseUrl: undefined,
  apiPath: undefined,
});

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/translate', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it('returns structured selection fields even when includeRelated is false', async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        itemTranslation: '垃圾',
        exampleSentence: 'Will someone take out the trash?',
        exampleTranslation: '谁来倒垃圾？',
        pronunciation: 'træʃ',
      }),
    });

    const response = await POST(
      makeRequest({
        text: 'Will someone take out the trash (= take it outside the house)?',
        context: 'Will someone take out the trash (= take it outside the house)?',
        targetLang: 'zh-CN',
        selectionType: 'word',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      translation: '垃圾',
      itemTranslation: '垃圾',
      exampleSentence: 'Will someone take out the trash?',
      exampleTranslation: '谁来倒垃圾？',
      pronunciation: 'træʃ',
    });
  });
});
