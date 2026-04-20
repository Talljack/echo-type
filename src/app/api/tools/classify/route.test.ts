import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  generateTextMock,
  resolveApiKeyMock,
  resolveProviderForCapabilityMock,
  mockResolution,
  MockProviderResolutionError,
} = vi.hoisted(() => {
  class MockProviderResolutionError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = 'ProviderResolutionError';
      this.code = code;
    }
  }

  return {
    generateTextMock: vi.fn(),
    resolveApiKeyMock: vi.fn(() => 'test-api-key'),
    resolveProviderForCapabilityMock: vi.fn(),
    mockResolution: {
      providerId: 'groq',
      modelId: 'mock-model',
      credentialSource: 'stored',
      fallbackApplied: false,
      fallbackReason: undefined,
      baseUrl: undefined,
      apiPath: undefined,
    },
    MockProviderResolutionError,
  };
});

vi.mock('ai', () => ({
  generateText: generateTextMock,
}));

vi.mock('@/lib/ai-model', () => ({
  resolveApiKey: resolveApiKeyMock,
  resolveModel: vi.fn(() => ({ mocked: true })),
}));

vi.mock('@/lib/platform-provider', () => ({
  enforcePlatformRateLimit: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/provider-resolver', () => ({
  ProviderResolutionError: MockProviderResolutionError,
  resolveProviderForCapability: resolveProviderForCapabilityMock,
}));

vi.mock('@/lib/providers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/providers')>('@/lib/providers');

  return {
    ...actual,
    PROVIDER_REGISTRY: {
      ...actual.PROVIDER_REGISTRY,
      groq: {
        ...actual.PROVIDER_REGISTRY.groq,
        name: 'Groq',
      },
    },
  };
});

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tools/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tools/classify', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    resolveApiKeyMock.mockReset();
    resolveApiKeyMock.mockReturnValue('test-api-key');
    resolveProviderForCapabilityMock.mockReset();
    resolveProviderForCapabilityMock.mockReturnValue(mockResolution);
  });

  it('asks the user to configure a model when no provider is available', async () => {
    resolveProviderForCapabilityMock.mockImplementation(() => {
      throw new MockProviderResolutionError('no_fallback_available', 'No configured provider is available.');
    });

    const response = await POST(
      makeRequest({
        text: 'Hello world',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'No AI model configured for classification. Add a provider API key in Settings first.',
      code: 'no_fallback_available',
    });
  });

  it('asks the user to configure the selected provider key when it is missing', async () => {
    resolveApiKeyMock.mockReturnValue('');

    const response = await POST(
      makeRequest({
        text: 'Hello world',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'No API key configured for Groq. Add your key in Settings.',
      code: 'provider_not_configured',
    });
  });
});
