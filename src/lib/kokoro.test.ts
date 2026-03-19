import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

const { listKokoroVoices, synthesizeKokoroSpeech } = await import('./kokoro');

describe('kokoro helpers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists and normalizes Kokoro voices', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ voices: ['af_heart', 'bm_daniel', 'zf_xiaoyi'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const voices = await listKokoroVoices('http://54.166.253.41:8880');

    expect(fetchMock).toHaveBeenCalledWith('http://54.166.253.41:8880/v1/audio/voices', expect.any(Object));
    expect(voices).toEqual([
      {
        id: 'af_heart',
        name: 'Heart',
        language: 'American English',
        langCode: 'en-US',
        gender: 'female',
      },
      {
        id: 'bm_daniel',
        name: 'Daniel',
        language: 'British English',
        langCode: 'en-GB',
        gender: 'male',
      },
      {
        id: 'zf_xiaoyi',
        name: 'Xiaoyi',
        language: 'Chinese',
        langCode: 'zh-CN',
        gender: 'female',
      },
    ]);
  });

  it('sends bearer auth when apiKey is provided', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ voices: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listKokoroVoices('http://localhost:8880/', 'kokoro-secret');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8880/v1/audio/voices',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer kokoro-secret',
        }),
      }),
    );
  });

  it('propagates voice listing failures with status details', async () => {
    fetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }));

    await expect(listKokoroVoices('http://localhost:8880')).rejects.toThrow(
      'Kokoro voices request failed (401): unauthorized',
    );
  });

  it('synthesizes Kokoro speech and returns audio bytes plus content type', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    );

    const result = await synthesizeKokoroSpeech({
      serverUrl: 'http://54.166.253.41:8880/',
      apiKey: 'kokoro-key',
      text: 'Hello from EchoType',
      voice: 'af_heart',
      speed: 1.2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://54.166.253.41:8880/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer kokoro-key',
        }),
        body: JSON.stringify({
          model: 'kokoro',
          input: 'Hello from EchoType',
          voice: 'af_heart',
          response_format: 'mp3',
          speed: 1.2,
        }),
      }),
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(result.audioBuffer))).toEqual([1, 2, 3]);
  });

  it('falls back to audio/mpeg when content-type header is missing', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2]), { status: 200 }));

    const result = await synthesizeKokoroSpeech({
      serverUrl: 'http://localhost:8880',
      text: 'Hello',
      voice: 'af_heart',
    });

    expect(result.contentType).toBe('audio/mpeg');
  });

  it('propagates synthesis failures with status details', async () => {
    fetchMock.mockResolvedValue(new Response('bad request', { status: 400 }));

    await expect(
      synthesizeKokoroSpeech({
        serverUrl: 'http://localhost:8880',
        text: 'Hello',
        voice: 'af_heart',
      }),
    ).rejects.toThrow('Kokoro speech synthesis failed (400): bad request');
  });
});
