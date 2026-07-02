import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('POST /api/tools/download', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns a production-safe unsupported response on Vercel', async () => {
    vi.stubEnv('VERCEL', '1');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/download', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=test', format: 'audio' }),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(501);
    expect(data.error).toContain('Media download is not available');
    expect(data.hint).toContain('transcript');
  });
});
