import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { ProviderCapability } from './provider-capabilities';
import type { CredentialSource, ProviderResolution } from './provider-resolver';
import type { ProviderId } from './providers';

const PLATFORM_GROQ_ENV_KEY = 'GROQ_API_KEY';
const UPSTASH_REDIS_URL_ENV_KEY = 'UPSTASH_REDIS_REST_URL';
const UPSTASH_REDIS_TOKEN_ENV_KEY = 'UPSTASH_REDIS_REST_TOKEN';
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_WINDOW = '60 s';
const RATE_LIMIT_PREFIX = 'echotype:platform-groq';
const RATE_LIMIT_MESSAGE =
  'Platform Groq capacity is temporarily busy. Please try again shortly or add your own API key in Settings.';

const PLATFORM_RATE_LIMITS: Record<ProviderCapability, number> = {
  chat: 30,
  generate: 12,
  classify: 30,
  translateText: 30,
  transcribe: 4,
  translateAudio: 4,
  evaluate: 12,
};

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface PlatformRateLimitState {
  entries: Map<string, RateLimitEntry>;
}

interface UpstashRateLimitBundle {
  redis: Redis;
  limiters: Partial<Record<ProviderCapability, Ratelimit>>;
}

declare global {
  var __echotypePlatformRateLimitState: PlatformRateLimitState | undefined;
  var __echotypeUpstashRateLimitBundle: UpstashRateLimitBundle | undefined;
}

function getRateLimitState(): PlatformRateLimitState {
  globalThis.__echotypePlatformRateLimitState ??= {
    entries: new Map(),
  };
  return globalThis.__echotypePlatformRateLimitState;
}

function getRateLimitKey(clientAddress: string, capability: ProviderCapability) {
  return `${clientAddress}:${capability}`;
}

export function resetPlatformRateLimitState() {
  globalThis.__echotypePlatformRateLimitState = {
    entries: new Map(),
  };
  globalThis.__echotypeUpstashRateLimitBundle = undefined;
}

export function getPlatformGroqApiKey(): string {
  return process.env[PLATFORM_GROQ_ENV_KEY] || '';
}

export function hasPlatformProviderKey(providerId: ProviderId): boolean {
  return providerId === 'groq' && Boolean(getPlatformGroqApiKey());
}

export function hasUpstashRateLimitEnv(): boolean {
  return Boolean(process.env[UPSTASH_REDIS_URL_ENV_KEY] && process.env[UPSTASH_REDIS_TOKEN_ENV_KEY]);
}

function getUpstashBundle(): UpstashRateLimitBundle | null {
  if (!hasUpstashRateLimitEnv()) {
    return null;
  }

  globalThis.__echotypeUpstashRateLimitBundle ??= {
    redis: Redis.fromEnv(),
    limiters: {},
  };

  return globalThis.__echotypeUpstashRateLimitBundle;
}

function getUpstashLimiter(capability: ProviderCapability): Ratelimit | null {
  const bundle = getUpstashBundle();
  if (!bundle) {
    return null;
  }

  bundle.limiters[capability] ??= new Ratelimit({
    redis: bundle.redis,
    limiter: Ratelimit.slidingWindow(PLATFORM_RATE_LIMITS[capability], DEFAULT_WINDOW),
    prefix: `${RATE_LIMIT_PREFIX}:${capability}`,
    analytics: false,
  });

  return bundle.limiters[capability] ?? null;
}

export function getClientAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || 'unknown';
}

export function isUsingPlatformProvider(providerId: ProviderId, credentialSource: CredentialSource): boolean {
  return providerId === 'groq' && credentialSource === 'platform';
}

function enforceInMemoryRateLimit(headers: Headers, capability: ProviderCapability) {
  const now = Date.now();
  const resetAt = now + DEFAULT_WINDOW_MS;
  const clientAddress = getClientAddress(headers);
  const key = getRateLimitKey(clientAddress, capability);
  const state = getRateLimitState();
  const current = state.entries.get(key);

  if (!current || current.resetAt <= now) {
    state.entries.set(key, { count: 1, resetAt });
    return { ok: true as const };
  }

  if (current.count >= PLATFORM_RATE_LIMITS[capability]) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      message: RATE_LIMIT_MESSAGE,
    };
  }

  current.count += 1;
  state.entries.set(key, current);
  return { ok: true as const };
}

async function enforceUpstashRateLimit(headers: Headers, capability: ProviderCapability) {
  const limiter = getUpstashLimiter(capability);
  if (!limiter) {
    return null;
  }

  const clientAddress = getClientAddress(headers);
  const result = await limiter.limit(clientAddress);

  if (result.success) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    message: RATE_LIMIT_MESSAGE,
  };
}

export async function enforcePlatformRateLimit({
  headers,
  capability,
  resolution,
}: {
  headers: Headers;
  capability: ProviderCapability;
  resolution: ProviderResolution;
}): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number; message: string }> {
  if (!isUsingPlatformProvider(resolution.providerId, resolution.credentialSource)) {
    return { ok: true };
  }

  if (!hasUpstashRateLimitEnv()) {
    return enforceInMemoryRateLimit(headers, capability);
  }

  try {
    return (await enforceUpstashRateLimit(headers, capability)) ?? enforceInMemoryRateLimit(headers, capability);
  } catch (error) {
    console.warn('Platform rate limit backend failed, falling back to in-memory limiter.', error);
    return enforceInMemoryRateLimit(headers, capability);
  }
}
