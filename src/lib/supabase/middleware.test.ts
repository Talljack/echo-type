import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const createServerClientMock = vi.mocked(createServerClient);

describe('supabase middleware', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalTimeout = process.env.SUPABASE_AUTH_REFRESH_TIMEOUT_MS;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_AUTH_REFRESH_TIMEOUT_MS = '10';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
    process.env.SUPABASE_AUTH_REFRESH_TIMEOUT_MS = originalTimeout;
  });

  it('does not block page requests when Supabase auth refresh hangs', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn(() => new Promise(() => {})),
      },
    } as never);

    const { updateSession } = await import('./middleware');

    const response = await Promise.race([
      updateSession(new NextRequest('http://localhost:3000/dashboard')),
      new Promise<'timed-out'>((resolve) => setTimeout(() => resolve('timed-out'), 50)),
    ]);

    expect(response).not.toBe('timed-out');
  });
});
