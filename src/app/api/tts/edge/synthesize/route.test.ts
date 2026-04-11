import { beforeEach, describe, expect, it, vi } from 'vitest';

const synthesizeMock = vi.fn();

vi.mock('@/lib/edge-tts', () => ({
  synthesizeEdgeSpeech: synthesizeMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/tts/edge/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/edge/synthesize', () => {
  beforeEach(() => {
    synthesizeMock.mockReset();
  });

  it('returns 400 when text is missing', async () => {
    const res = await POST(makeRequest({ voice: 'en-US-AriaNeural' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when text is empty whitespace', async () => {
    const res = await POST(makeRequest({ text: '   ', voice: 'en-US-AriaNeural' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/text/i);
  });

  it('returns 400 when voice is missing', async () => {
    const res = await POST(makeRequest({ text: 'Hello world' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/voice/i);
  });

  it('returns audio and word boundaries on success', async () => {
    const audioBuffer = Buffer.from([1, 2, 3, 4]);
    synthesizeMock.mockResolvedValue({
      audioBuffer,
      contentType: 'audio/mpeg',
      wordBoundaries: [
        { word: 'Hello', start: 0.1, end: 0.475 },
        { word: 'world', start: 0.5, end: 0.85 },
      ],
    });

    const res = await POST(makeRequest({ text: 'Hello world', voice: 'en-US-AriaNeural' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audio).toBe(audioBuffer.toString('base64'));
    expect(data.contentType).toBe('audio/mpeg');
    expect(data.words).toEqual([
      { word: 'Hello', start: 0.1, end: 0.475 },
      { word: 'world', start: 0.5, end: 0.85 },
    ]);
  });

  it('passes speed to synthesizeEdgeSpeech', async () => {
    synthesizeMock.mockResolvedValue({
      audioBuffer: Buffer.from([]),
      contentType: 'audio/mpeg',
      wordBoundaries: [],
    });

    await POST(makeRequest({ text: 'test', voice: 'en-US-AriaNeural', speed: 1.5 }));

    expect(synthesizeMock).toHaveBeenCalledWith({ text: 'test', voice: 'en-US-AriaNeural', speed: 1.5 });
  });

  it('returns 500 with error message on synthesis failure', async () => {
    synthesizeMock.mockRejectedValue(new Error('Synthesis timeout'));

    const res = await POST(makeRequest({ text: 'Hello', voice: 'en-US-AriaNeural' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Synthesis timeout');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    synthesizeMock.mockRejectedValue('unknown');

    const res = await POST(makeRequest({ text: 'Hello', voice: 'en-US-AriaNeural' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Edge TTS synthesis failed.');
  });
});
