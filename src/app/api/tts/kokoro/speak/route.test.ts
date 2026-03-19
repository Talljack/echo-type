import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const synthesizeMock = vi.fn();

vi.mock('@/lib/kokoro', () => ({
  synthesizeKokoroSpeech: synthesizeMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/kokoro/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/kokoro/speak', () => {
  beforeEach(() => {
    synthesizeMock.mockReset();
  });

  it('returns 400 when serverUrl is missing', async () => {
    const res = await POST(makeRequest({ text: 'Hello', voice: 'af_heart' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/server url/i);
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880', voice: 'af_heart' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when voice is missing', async () => {
    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880', text: 'Hello' }));
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
        serverUrl: 'http://localhost:8880',
        apiKey: 'kokoro-key',
        text: 'Hello there',
        voice: 'af_heart',
        speed: 1,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(synthesizeMock).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:8880',
      apiKey: 'kokoro-key',
      text: 'Hello there',
      voice: 'af_heart',
      speed: 1,
    });
  });

  it('returns 500 with error message on synthesis failure', async () => {
    synthesizeMock.mockRejectedValue(new Error('Server unavailable'));

    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880', text: 'Hello', voice: 'af_heart' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Server unavailable');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    synthesizeMock.mockRejectedValue('unknown error');

    const res = await POST(makeRequest({ serverUrl: 'http://localhost:8880', text: 'Hello', voice: 'af_heart' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Kokoro speech synthesis failed.');
  });
});
