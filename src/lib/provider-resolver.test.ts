import { afterEach, describe, expect, it } from 'vitest';
import { resolveProviderForCapability, ProviderResolutionError } from './provider-resolver';

describe('provider resolver', () => {
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('uses the requested provider when it supports the capability', () => {
    const resolution = resolveProviderForCapability({
      capability: 'chat',
      requestedProviderId: 'openai',
      availableProviderConfigs: {
        openai: {
          providerId: 'openai',
          auth: { type: 'api-key', apiKey: 'test-openai-key' },
          selectedModelId: 'gpt-4o',
        },
      },
    });

    expect(resolution.providerId).toBe('openai');
    expect(resolution.fallbackApplied).toBe(false);
    expect(resolution.credentialSource).toBe('stored');
  });

  it('falls back to Groq when the requested provider lacks a capability', () => {
    const resolution = resolveProviderForCapability({
      capability: 'transcribe',
      requestedProviderId: 'anthropic',
      availableProviderConfigs: {
        groq: {
          providerId: 'groq',
          auth: { type: 'api-key', apiKey: 'groq-key' },
          selectedModelId: 'llama-3.3-70b-versatile',
        },
      },
    });

    expect(resolution.providerId).toBe('groq');
    expect(resolution.modelId).toBe('whisper-large-v3-turbo');
    expect(resolution.fallbackApplied).toBe(true);
    expect(resolution.credentialSource).toBe('stored');
  });

  it('falls back to platform Groq when user config is missing but the platform key exists', () => {
    process.env.GROQ_API_KEY = 'platform-groq-key';

    const resolution = resolveProviderForCapability({
      capability: 'chat',
      requestedProviderId: 'anthropic',
    });

    expect(resolution.providerId).toBe('groq');
    expect(resolution.credentialSource).toBe('platform');
    expect(resolution.fallbackApplied).toBe(true);
  });

  it('falls back to OpenAI when Groq is unavailable', () => {
    const resolution = resolveProviderForCapability({
      capability: 'transcribe',
      requestedProviderId: 'anthropic',
      availableProviderConfigs: {
        openai: {
          providerId: 'openai',
          auth: { type: 'api-key', apiKey: 'openai-env-key' },
          selectedModelId: 'gpt-4o',
        },
      },
    });

    expect(resolution.providerId).toBe('openai');
    expect(resolution.modelId).toBe('whisper-1');
    expect(resolution.fallbackApplied).toBe(true);
    expect(resolution.credentialSource).toBe('stored');
  });

  it('uses another configured provider when the requested chain is unavailable', () => {
    const resolution = resolveProviderForCapability({
      capability: 'generate',
      requestedProviderId: 'groq',
      availableProviderConfigs: {
        anthropic: {
          providerId: 'anthropic',
          auth: { type: 'api-key', apiKey: 'anthropic-key' },
          selectedModelId: 'claude-sonnet-4-5-20251001',
        },
      },
    });

    expect(resolution.providerId).toBe('anthropic');
    expect(resolution.fallbackApplied).toBe(true);
    expect(resolution.credentialSource).toBe('stored');
    expect(resolution.fallbackReason).toContain('using configured provider anthropic');
  });

  it('throws a structured error when no provider is available', () => {
    expect(() =>
      resolveProviderForCapability({
        capability: 'transcribe',
        requestedProviderId: 'anthropic',
      }),
    ).toThrowError(ProviderResolutionError);

    try {
      resolveProviderForCapability({
        capability: 'transcribe',
        requestedProviderId: 'anthropic',
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: 'no_fallback_available',
        capability: 'transcribe',
        requestedProviderId: 'anthropic',
      });
    }
  });
});
