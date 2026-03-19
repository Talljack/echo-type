import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const listVoicesMock = vi.fn();

vi.mock('@/lib/kokoro', () => ({
  listKokoroVoices: listVoicesMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/kokoro/voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/kokoro/voices', () => {
  beforeEach(() => {
    listVoicesMock.mockReset();
  });

  it('returns 400 when serverUrl is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/server url/i);
  });

  it('returns voices on success', async () => {
    const mockVoices = [{ id: 'af_heart', name: 'Heart', language: 'American English', langCode: 'en-US' }];
    listVoicesMock.mockResolvedValue(mockVoices);

    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880', apiKey: 'kokoro-key' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.voices).toEqual(mockVoices);
    expect(listVoicesMock).toHaveBeenCalledWith('http://localhost:8880', 'kokoro-key');
  });

  it('returns 500 with error message on API failure', async () => {
    listVoicesMock.mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    listVoicesMock.mockRejectedValue('network error');

    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to load Kokoro voices.');
  });
});
