import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_GOOGLE_TTS_VOICES, listGoogleVoices, synthesizeGoogleSpeech } from './google-tts';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

describe('google-tts', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('lists English voices and sorts higher quality voices first within a locale', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          { name: 'en-US-Standard-A', languageCodes: ['en-US'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
          { name: 'zh-CN-Standard-A', languageCodes: ['zh-CN'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
          { name: 'en-US-Wavenet-F', languageCodes: ['en-US'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
          { name: 'en-GB-Wavenet-A', languageCodes: ['en-GB'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 },
        ],
      }),
    });

    const voices = await listGoogleVoices('key');

    expect(fetchMock).toHaveBeenCalledWith('https://texttospeech.googleapis.com/v1/voices?key=key');
    expect(voices.map((voice) => voice.name)).toEqual([
      'en-GB-Wavenet-A',
      'en-US-Wavenet-F',
      'en-US-Standard-A',
    ]);
  });

  it('uses fallback WaveNet voices when the API returns no English voices', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [{ name: 'ja-JP-Standard-A', languageCodes: ['ja-JP'], ssmlGender: 'FEMALE', naturalSampleRateHertz: 24_000 }],
      }),
    });

    await expect(listGoogleVoices('key')).resolves.toEqual(FALLBACK_GOOGLE_TTS_VOICES);
  });

  it('throws a useful error when listing voices fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'API has not been enabled' } }),
    });

    await expect(listGoogleVoices('bad-key')).rejects.toThrow(
      'Google Cloud TTS voices request failed (403): API has not been enabled',
    );
  });

  it('synthesizes MP3 audio with selected voice and clamped audio config', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: Buffer.from([1, 2, 3, 4]).toString('base64') }),
    });

    const result = await synthesizeGoogleSpeech({
      apiKey: 'key',
      text: 'Hello',
      voiceName: 'en-US-Wavenet-F',
      languageCode: 'en-US',
      speed: 10,
      pitch: 4,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://texttospeech.googleapis.com/v1/text:synthesize?key=key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 'Hello' },
          voice: { languageCode: 'en-US', name: 'en-US-Wavenet-F' },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 4,
            pitch: 20,
          },
        }),
      }),
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect([...result.audioBuffer]).toEqual([1, 2, 3, 4]);
  });

  it('throws when synthesis returns no audio content', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(
      synthesizeGoogleSpeech({
        apiKey: 'key',
        text: 'Hello',
        voiceName: 'en-US-Wavenet-F',
      }),
    ).rejects.toThrow('Google Cloud TTS synthesis returned no audio.');
  });
});
