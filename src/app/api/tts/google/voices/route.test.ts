import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const listVoicesMock = vi.fn();

vi.mock('@/lib/google-tts', () => ({
  listGoogleVoices: listVoicesMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/google/voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/google/voices', () => {
  beforeEach(() => {
    listVoicesMock.mockReset();
    vi.stubEnv('GOOGLE_API_KEY', '');
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/API key/i);
  });

  it('uses GOOGLE_API_KEY when apiKey is missing from the request', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'env-key');
    listVoicesMock.mockResolvedValue([]);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    expect(listVoicesMock).toHaveBeenCalledWith('env-key');
  });

  it('returns voices on success', async () => {
    const mockVoices = [
      { name: 'en-US-Wavenet-F', languageCodes: ['en-US'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
      { name: 'en-GB-Wavenet-B', languageCodes: ['en-GB'], ssmlGender: 'MALE', naturalSampleRateHertz: 24_000 },
    ];
    listVoicesMock.mockResolvedValue(mockVoices);

    const res = await POST(makeRequest({ apiKey: 'key' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.voices).toEqual(mockVoices);
    expect(listVoicesMock).toHaveBeenCalledWith('key');
  });

  it('returns 500 with error message on API failure', async () => {
    listVoicesMock.mockRejectedValue(new Error('API has not been enabled'));

    const res = await POST(makeRequest({ apiKey: 'bad-key' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('API has not been enabled');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    listVoicesMock.mockRejectedValue('network error');

    const res = await POST(makeRequest({ apiKey: 'key' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to load Google Cloud TTS voices.');
  });
});
