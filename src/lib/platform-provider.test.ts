import { afterEach, describe, expect, it, vi } from 'vitest';

const upstashMocks = vi.hoisted(() => {
  const limit = vi.fn();
  const slidingWindow = vi.fn();
  const fromEnv = vi.fn();
  const RatelimitMock = vi.fn(function MockRatelimit() {
    return { limit };
  });

  Object.assign(RatelimitMock, { slidingWindow });

  return {
    limit,
    slidingWindow,
    fromEnv,
    RatelimitMock,
  };
});

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: upstashMocks.RatelimitMock,
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: upstashMocks.fromEnv,
  },
}));

import { enforcePlatformRateLimit, hasUpstashRateLimitEnv, resetPlatformRateLimitState } from './platform-provider';

const baseResolution = {
  providerId: 'groq' as const,
  modelId: 'llama-3.3-70b-versatile',
  fallbackApplied: false,
};

describe('platform provider helpers', () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPlatformRateLimitState();
    vi.clearAllMocks();
  });

  it('does not rate limit non-platform traffic', async () => {
    const result = await enforcePlatformRateLimit({
      headers: new Headers(),
      capability: 'chat',
      resolution: {
        ...baseResolution,
        credentialSource: 'stored',
      },
    });

    expect(result).toEqual({ ok: true });
  });

  it('rate limits shared platform Groq traffic after the per-minute threshold without Upstash', async () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9' });

    for (let i = 0; i < 30; i += 1) {
      await expect(
        enforcePlatformRateLimit({
          headers,
          capability: 'chat',
          resolution: {
            ...baseResolution,
            credentialSource: 'platform',
          },
        }),
      ).resolves.toEqual({ ok: true });
    }

    const blocked = await enforcePlatformRateLimit({
      headers,
      capability: 'chat',
      resolution: {
        ...baseResolution,
        credentialSource: 'platform',
      },
    });

    expect(blocked).toMatchObject({
      ok: false,
    });
  });

  it('uses Upstash when global rate limit env vars are configured', async () => {
    upstashMocks.fromEnv.mockReturnValue({ kind: 'redis' });
    upstashMocks.slidingWindow.mockReturnValue('sliding-window');
    upstashMocks.limit.mockResolvedValue({
      success: false,
      reset: Date.now() + 15_000,
    });

    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    expect(hasUpstashRateLimitEnv()).toBe(true);

    const result = await enforcePlatformRateLimit({
      headers: new Headers({ 'x-forwarded-for': '198.51.100.7' }),
      capability: 'chat',
      resolution: {
        ...baseResolution,
        credentialSource: 'platform',
      },
    });

    expect(upstashMocks.fromEnv).toHaveBeenCalledTimes(1);
    expect(upstashMocks.slidingWindow).toHaveBeenCalledWith(30, '60 s');
    expect(upstashMocks.limit).toHaveBeenCalledWith('198.51.100.7');
    expect(result).toMatchObject({
      ok: false,
    });
  });
});
