import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const synthesizeMock = vi.fn();

vi.mock('@/lib/google-tts', () => ({
  synthesizeGoogleSpeech: synthesizeMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/google/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/google/speak', () => {
  beforeEach(() => {
    synthesizeMock.mockReset();
    vi.stubEnv('GOOGLE_API_KEY', '');
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ text: 'Hello', voiceName: 'en-US-Wavenet-F' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/API key/i);
  });

  it('uses GOOGLE_API_KEY when apiKey is missing from the request', async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'env-key');
    synthesizeMock.mockResolvedValue({
      audioBuffer: new Uint8Array([1, 2]).buffer,
      contentType: 'audio/mpeg',
    });

    const res = await POST(makeRequest({ text: 'Hello', voiceName: 'en-US-Wavenet-F' }));

    expect(res.status).toBe(200);
    expect(synthesizeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'env-key',
        text: 'Hello',
        voiceName: 'en-US-Wavenet-F',
      }),
    );
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'key', voiceName: 'en-US-Wavenet-F' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when voiceName is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'key', text: 'Hello' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/voice/i);
  });

  it('returns audio bytes on successful synthesis', async () => {
    const audioBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    synthesizeMock.mockResolvedValue({
      audioBuffer,
      contentType: 'audio/mpeg',
    });

    const res = await POST(
      makeRequest({
        apiKey: 'key',
        text: 'Hello there',
        voiceName: 'en-US-Wavenet-F',
        languageCode: 'en-US',
        speed: 1,
        pitch: 1,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(synthesizeMock).toHaveBeenCalledWith({
      apiKey: 'key',
      text: 'Hello there',
      voiceName: 'en-US-Wavenet-F',
      languageCode: 'en-US',
      speed: 1,
      pitch: 1,
    });

    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('returns 500 with error message on synthesis failure', async () => {
    synthesizeMock.mockRejectedValue(new Error('Quota exceeded'));

    const res = await POST(makeRequest({ apiKey: 'key', text: 'Hello', voiceName: 'en-US-Wavenet-F' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Quota exceeded');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    synthesizeMock.mockRejectedValue('unknown error');

    const res = await POST(makeRequest({ apiKey: 'key', text: 'Hello', voiceName: 'en-US-Wavenet-F' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Google Cloud TTS synthesis failed.');
  });
});
