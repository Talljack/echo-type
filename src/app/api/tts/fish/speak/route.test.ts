import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const synthesizeMock = vi.fn();

vi.mock('@/lib/fish-audio', () => ({
  synthesizeFishSpeech: synthesizeMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/fish/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/fish/speak', () => {
  beforeEach(() => {
    synthesizeMock.mockReset();
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ text: 'Hello', voiceId: 'v1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/API key/i);
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'key', voiceId: 'v1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when text is empty whitespace', async () => {
    const res = await POST(makeRequest({ apiKey: 'key', text: '   ', voiceId: 'v1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when voiceId is missing', async () => {
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
        voiceId: 'voice-1',
        model: 'speech-1.6',
        speed: 1.0,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const buffer = await res.arrayBuffer();
    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('defaults model to speech-1.6 when not provided', async () => {
    synthesizeMock.mockResolvedValue({
      audioBuffer: new ArrayBuffer(0),
      contentType: 'audio/mpeg',
    });

    await POST(makeRequest({ apiKey: 'key', text: 'Hello', voiceId: 'v1' }));

    expect(synthesizeMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'speech-1.6' }),
    );
  });

  it('returns 500 with error message on synthesis failure', async () => {
    synthesizeMock.mockRejectedValue(new Error('Insufficient Balance'));

    const res = await POST(
      makeRequest({ apiKey: 'key', text: 'Hello', voiceId: 'v1', model: 'speech-1.6' }),
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Insufficient Balance');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    synthesizeMock.mockRejectedValue('unknown error');

    const res = await POST(
      makeRequest({ apiKey: 'key', text: 'Hello', voiceId: 'v1' }),
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Fish Audio synthesis failed.');
  });
});
