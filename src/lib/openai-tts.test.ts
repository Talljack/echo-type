import { beforeEach, describe, expect, it, vi } from 'vitest';
import { synthesizeOpenAISpeech } from './openai-tts';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('openai-tts', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('synthesizes MP3 audio through a custom OpenAI-compatible base URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });

    const result = await synthesizeOpenAISpeech({
      apiKey: 'key',
      baseUrl: 'https://gateway.example/v1/',
      text: 'Hello',
      model: 'gpt-4o-mini-tts',
      voice: 'marin',
      speed: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gateway.example/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: 'Hello',
          voice: 'marin',
          response_format: 'mp3',
          speed: 4,
        }),
      }),
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect([...result.audioBuffer]).toEqual([1, 2, 3]);
  });

  it('includes instructions only for gpt-4o TTS models', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      arrayBuffer: async () => new Uint8Array([1]).buffer,
    });

    await synthesizeOpenAISpeech({
      apiKey: 'key',
      text: 'Hello',
      model: 'gpt-4o-mini-tts',
      voice: 'cedar',
      instructions: 'Speak clearly.',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/speech',
      expect.objectContaining({
        body: expect.stringContaining('"instructions":"Speak clearly."'),
      }),
    );
  });

  it('throws a useful error when synthesis fails with JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ error: { message: 'Not Found' } }),
    });

    await expect(
      synthesizeOpenAISpeech({
        apiKey: 'key',
        text: 'Hello',
        voice: 'marin',
      }),
    ).rejects.toThrow('OpenAI TTS synthesis failed (404): Not Found');
  });

  it('throws when synthesis returns empty audio', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'audio/mpeg' }),
      arrayBuffer: async () => new ArrayBuffer(0),
    });

    await expect(
      synthesizeOpenAISpeech({
        apiKey: 'key',
        text: 'Hello',
        voice: 'marin',
      }),
    ).rejects.toThrow('OpenAI TTS synthesis returned no audio.');
  });
});
