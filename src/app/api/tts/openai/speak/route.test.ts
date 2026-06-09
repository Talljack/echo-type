import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const synthesizeMock = vi.fn();

vi.mock('@/lib/openai-tts', () => ({
  synthesizeOpenAISpeech: synthesizeMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/openai/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/openai/speak', () => {
  beforeEach(() => {
    synthesizeMock.mockReset();
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ text: 'Hello', voice: 'marin' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/API key/i);
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'key', voice: 'marin' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when voice is missing', async () => {
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
        baseUrl: 'https://gateway.example/v1',
        text: 'Hello there',
        model: 'gpt-4o-mini-tts',
        voice: 'marin',
        speed: 1,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(synthesizeMock).toHaveBeenCalledWith({
      apiKey: 'key',
      baseUrl: 'https://gateway.example/v1',
      text: 'Hello there',
      model: 'gpt-4o-mini-tts',
      voice: 'marin',
      speed: 1,
      instructions: undefined,
    });

    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('returns 500 with error message on synthesis failure', async () => {
    synthesizeMock.mockRejectedValue(new Error('Not Found'));

    const res = await POST(makeRequest({ apiKey: 'key', text: 'Hello', voice: 'marin' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Not Found');
  });
});
