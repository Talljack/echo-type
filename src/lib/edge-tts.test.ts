import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();
const mockEdgeTTS = vi.fn();

vi.mock('edge-tts-universal', () => ({
  VoicesManager: { create: mockCreate },
  EdgeTTS: mockEdgeTTS,
}));

describe('edge-tts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCreate.mockReset();
    mockEdgeTTS.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  function makeVoice(overrides: Record<string, unknown> = {}) {
    return {
      ShortName: 'en-US-AriaNeural',
      Locale: 'en-US',
      Gender: 'Female',
      VoiceTag: { VoicePersonalities: ['Positive', 'Confident'] },
      ...overrides,
    };
  }

  describe('listEdgeVoices', () => {
    it('returns normalized voices from VoicesManager', async () => {
      mockCreate.mockResolvedValue({
        find: () => [
          makeVoice({ ShortName: 'en-US-AriaNeural', Locale: 'en-US', Gender: 'Female' }),
          makeVoice({ ShortName: 'en-GB-RyanNeural', Locale: 'en-GB', Gender: 'Male' }),
        ],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      const voices = await listEdgeVoices();

      expect(voices).toHaveLength(2);
      expect(voices[0]).toMatchObject({
        id: 'en-US-AriaNeural',
        name: 'Aria',
        locale: 'en-US',
        gender: 'Female',
        personalities: ['Positive', 'Confident'],
      });
    });

    it('sorts en-US before en-GB, females before males', async () => {
      mockCreate.mockResolvedValue({
        find: () => [
          makeVoice({ ShortName: 'en-GB-RyanNeural', Locale: 'en-GB', Gender: 'Male' }),
          makeVoice({ ShortName: 'en-US-GuyNeural', Locale: 'en-US', Gender: 'Male' }),
          makeVoice({ ShortName: 'en-US-AriaNeural', Locale: 'en-US', Gender: 'Female' }),
        ],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      const voices = await listEdgeVoices();

      expect(voices.map((v) => v.id)).toEqual(['en-US-AriaNeural', 'en-US-GuyNeural', 'en-GB-RyanNeural']);
    });

    it('parses Multilingual suffix into display name', async () => {
      mockCreate.mockResolvedValue({
        find: () => [makeVoice({ ShortName: 'en-US-AvaMultilingualNeural', Locale: 'en-US' })],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      const voices = await listEdgeVoices();

      expect(voices[0].name).toBe('Ava (Multilingual)');
    });

    it('parses Expressive suffix into display name', async () => {
      mockCreate.mockResolvedValue({
        find: () => [makeVoice({ ShortName: 'en-IN-NeerjaExpressiveNeural', Locale: 'en-IN' })],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      const voices = await listEdgeVoices();

      expect(voices[0].name).toBe('Neerja (Expressive)');
    });

    it('caches voices for 1 hour', async () => {
      mockCreate.mockResolvedValue({
        find: () => [makeVoice()],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      await listEdgeVoices();
      await listEdgeVoices();

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('refetches after cache TTL expires', async () => {
      mockCreate.mockResolvedValue({
        find: () => [makeVoice()],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      await listEdgeVoices();
      vi.advanceTimersByTime(61 * 60 * 1000);
      await listEdgeVoices();

      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('returns fallback voices on failure with no cache', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      const { listEdgeVoices } = await import('./edge-tts');
      const voices = await listEdgeVoices();

      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0].id).toBe('en-US-AriaNeural');
    });

    it('returns cached voices on failure when cache exists', async () => {
      mockCreate.mockResolvedValueOnce({
        find: () => [makeVoice({ ShortName: 'en-US-JennyNeural' })],
      });

      const { listEdgeVoices } = await import('./edge-tts');
      await listEdgeVoices();

      mockCreate.mockRejectedValueOnce(new Error('Network error'));
      vi.advanceTimersByTime(61 * 60 * 1000);

      const voices = await listEdgeVoices();
      expect(voices[0].id).toBe('en-US-JennyNeural');
    });

    it('returns fallback voices when voice loading times out', async () => {
      mockCreate.mockImplementation(() => new Promise(() => {}));

      const { listEdgeVoices } = await import('./edge-tts');
      const promise = listEdgeVoices();
      await vi.advanceTimersByTimeAsync(4_000);

      const voices = await promise;
      expect(voices[0].id).toBe('en-US-AriaNeural');
    });

    it('caches fallback voices briefly after timeout', async () => {
      mockCreate.mockImplementation(() => new Promise(() => {}));

      const { listEdgeVoices } = await import('./edge-tts');
      const firstPromise = listEdgeVoices();
      await vi.advanceTimersByTimeAsync(4_000);
      await firstPromise;

      await listEdgeVoices();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('synthesizeEdgeSpeech', () => {
    function mockTTSInstance(audioBytes: number[], subtitle: { text: string; offset: number; duration: number }[]) {
      const arrayBuffer = new Uint8Array(audioBytes).buffer;
      mockEdgeTTS.mockImplementation(function (this: unknown) {
        return {
          synthesize: vi.fn().mockResolvedValue({
            audio: { arrayBuffer: () => arrayBuffer },
            subtitle,
          }),
        };
      });
    }

    function mockSequentialTTSInstances(
      responses: Array<{ audioBytes: number[]; subtitle: { text: string; offset: number; duration: number }[] }>,
    ) {
      let index = 0;
      mockEdgeTTS.mockImplementation(function (this: unknown) {
        const response = responses[index++] ?? responses.at(-1);
        const arrayBuffer = new Uint8Array(response.audioBytes).buffer;
        return {
          synthesize: vi.fn().mockResolvedValue({
            audio: { arrayBuffer: () => arrayBuffer },
            subtitle: response.subtitle,
          }),
        };
      });
    }

    it('returns audio buffer and word boundaries', async () => {
      mockTTSInstance([1, 2, 3], [
        { text: 'Hello', offset: 1_000_000, duration: 3_750_000 },
        { text: 'world', offset: 4_875_000, duration: 3_625_000 },
      ]);

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      const result = await synthesizeEdgeSpeech({ text: 'Hello world', voice: 'en-US-AriaNeural' });

      expect(result.contentType).toBe('audio/mpeg');
      expect(result.audioBuffer).toBeInstanceOf(Buffer);
      expect(result.wordBoundaries).toEqual([
        { word: 'Hello', start: 0.1, end: 0.475 },
        { word: 'world', start: 0.4875, end: 0.85 },
      ]);
    });

    it('converts speed to rate percentage string', async () => {
      mockTTSInstance([1], []);

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      await synthesizeEdgeSpeech({ text: 'test', voice: 'en-US-AriaNeural', speed: 1.5 });

      expect(mockEdgeTTS).toHaveBeenCalledWith('test', 'en-US-AriaNeural', { rate: '+50%' });
    });

    it('handles speed slower than 1.0', async () => {
      mockTTSInstance([1], []);

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      await synthesizeEdgeSpeech({ text: 'test', voice: 'en-US-AriaNeural', speed: 0.5 });

      expect(mockEdgeTTS).toHaveBeenCalledWith('test', 'en-US-AriaNeural', { rate: '-50%' });
    });

    it('uses Edge word boundaries as-is for slow speech', async () => {
      mockTTSInstance([1], [{ text: 'Hello', offset: 1_000_000, duration: 3_750_000 }]);

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      const result = await synthesizeEdgeSpeech({ text: 'Hello', voice: 'en-US-AriaNeural', speed: 0.5 });

      expect(result.wordBoundaries).toEqual([{ word: 'Hello', start: 0.1, end: 0.475 }]);
    });

    it('defaults speed to 1.0 (+0%)', async () => {
      mockTTSInstance([1], []);

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      await synthesizeEdgeSpeech({ text: 'test', voice: 'en-US-AriaNeural' });

      expect(mockEdgeTTS).toHaveBeenCalledWith('test', 'en-US-AriaNeural', { rate: '+0%' });
    });

    it('splits article-length text into multiple synthesis requests and merges boundaries', async () => {
      mockSequentialTTSInstances([
        {
          audioBytes: [1, 2],
          subtitle: [{ text: 'First', offset: 0, duration: 10_000_000 }],
        },
        {
          audioBytes: [3, 4],
          subtitle: [{ text: 'Second', offset: 0, duration: 5_000_000 }],
        },
      ]);

      const longText = `${Array.from({ length: 20 }, (_, i) => `first${i}`).join(' ')}. ${Array.from(
        { length: 20 },
        (_, i) => `second${i}`,
      ).join(' ')}.`;
      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      const result = await synthesizeEdgeSpeech({ text: longText, voice: 'en-US-AriaNeural' });

      expect(mockEdgeTTS).toHaveBeenCalledTimes(2);
      expect(result.audioBuffer).toEqual(Buffer.from([1, 2, 3, 4]));
      expect(result.wordBoundaries).toEqual([
        { word: 'First', start: 0, end: 1 },
        { word: 'Second', start: 1, end: 1.5 },
      ]);
    });

    it('keeps short text in one synthesis request', async () => {
      mockTTSInstance([1], []);

      const { splitEdgeSynthesisText, synthesizeEdgeSpeech } = await import('./edge-tts');
      expect(splitEdgeSynthesisText('Hello world. Nice to meet you.')).toEqual(['Hello world. Nice to meet you.']);

      await synthesizeEdgeSpeech({ text: 'Hello world. Nice to meet you.', voice: 'en-US-AriaNeural' });
      expect(mockEdgeTTS).toHaveBeenCalledTimes(1);
    });

    it('times out stalled synthesis requests', async () => {
      mockEdgeTTS.mockImplementation(function (this: unknown) {
        return {
          synthesize: vi.fn().mockImplementation(() => new Promise(() => {})),
        };
      });

      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      const promise = synthesizeEdgeSpeech({ text: 'test', voice: 'en-US-AriaNeural' });
      const assertion = expect(promise).rejects.toThrow('Edge TTS synthesis timed out.');
      await vi.advanceTimersByTimeAsync(15_000);
      await assertion;
    });

    it('allows longer synthesis time for article-length text', async () => {
      mockEdgeTTS.mockImplementation(function (this: unknown) {
        return {
          synthesize: vi.fn().mockImplementation(() => new Promise(() => {})),
        };
      });

      const longText = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
      const { synthesizeEdgeSpeech } = await import('./edge-tts');
      const promise = synthesizeEdgeSpeech({ text: longText, voice: 'en-US-AriaNeural' });
      let rejected = false;
      promise.catch(() => {
        rejected = true;
      });

      await vi.advanceTimersByTimeAsync(10_000);
      expect(rejected).toBe(false);

      const assertion = expect(promise).rejects.toThrow('Edge TTS synthesis timed out.');
      await vi.advanceTimersByTimeAsync(5_000);
      await assertion;
    });
  });
});
