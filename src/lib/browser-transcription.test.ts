import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProviderConfig, ProviderId } from '@/lib/providers';
import {
  DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD,
  shouldUseDirectBrowserTranscription,
  transcribeInBrowser,
} from './browser-transcription';

describe('browser transcription', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('switches large files to direct browser transcription', () => {
    const file = new File([new Uint8Array(DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD + 1)], 'sample.mp3', {
      type: 'audio/mpeg',
    });

    expect(shouldUseDirectBrowserTranscription(file)).toBe(true);
  });

  it('uses the first configured direct transcription provider', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          text: 'hello world',
          language: 'en',
          segments: [{ start: 0, end: 1.2, text: ' hello world ' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const file = new File(['audio'], 'sample.wav', { type: 'audio/wav' });
    const providerConfigs = {
      groq: {
        providerId: 'groq',
        auth: { type: 'api-key', apiKey: 'groq-key' },
      },
    } satisfies Partial<Record<ProviderId, Partial<ProviderConfig>>>;

    const result = await transcribeInBrowser({
      file,
      language: 'en',
      provider: 'groq',
      providerConfigs,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer groq-key',
        }),
      }),
    );
    expect(result).toMatchObject({
      text: 'hello world',
      language: 'en',
      duration: 1.2,
      providerId: 'groq',
      credentialSource: 'stored',
      fallbackApplied: false,
    });
    expect(result.segments).toEqual([{ start: 0, end: 1.2, text: 'hello world' }]);
  });

  it('falls back to the next configured provider when the requested one is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          text: 'fallback transcript',
          language: 'en',
          segments: [{ start: 0, end: 2, text: 'fallback transcript' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const file = new File(['audio'], 'sample.wav', { type: 'audio/wav' });
    const providerConfigs = {
      openai: {
        providerId: 'openai',
        auth: { type: 'api-key', apiKey: 'openai-key' },
      },
    } satisfies Partial<Record<ProviderId, Partial<ProviderConfig>>>;

    const result = await transcribeInBrowser({
      file,
      provider: 'groq',
      providerConfigs,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer openai-key',
        }),
      }),
    );
    expect(result.providerId).toBe('openai');
    expect(result.fallbackApplied).toBe(true);
  });
});
