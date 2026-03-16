import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchMock = vi.fn();
const convertMock = vi.fn();

vi.mock('fish-audio', () => ({
  FishAudioClient: vi.fn(function FishAudioClientMock() {
    return {
      voices: { search: searchMock },
      textToSpeech: { convert: convertMock },
    };
  }),
}));

const { listFishVoices, normalizeFishVoice, resolveTTSSource, synthesizeFishSpeech } = await import('./fish-audio');

function makeModelEntity(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'voice-1',
    type: 'tts' as const,
    title: 'Warm Tutor',
    description: 'Bright and friendly',
    cover_image: 'https://cdn.example.com/cover.png',
    state: 'trained' as const,
    tags: ['female', 'teacher'],
    created_at: '2026-03-01',
    updated_at: '2026-03-02',
    visibility: 'public' as const,
    like_count: 42,
    mark_count: 0,
    shared_count: 0,
    task_count: 15,
    author: {
      _id: 'author-1',
      nickname: 'Echo',
      avatar: 'https://cdn.example.com/avatar.png',
    },
    languages: ['en'],
    samples: {
      title: 'Sample',
      text: 'Hello from Fish Audio',
      task_id: 'task-1',
      audio: 'https://cdn.example.com/sample.mp3',
    },
    ...overrides,
  };
}

function makeStream(bytes: number[] = [1, 2, 3]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

function mockConvert(contentType = 'audio/mpeg', bytes: number[] = [1, 2, 3]) {
  convertMock.mockReturnValue({
    withRawResponse: vi.fn().mockResolvedValue({
      data: makeStream(bytes),
      rawResponse: {
        headers: new Headers({ 'content-type': contentType }),
      },
    }),
  });
}

describe('fish-audio helpers', () => {
  beforeEach(() => {
    searchMock.mockReset();
    convertMock.mockReset();
  });

  // --- normalizeFishVoice ---

  it('normalizes Fish model payloads for the client', () => {
    expect(normalizeFishVoice(makeModelEntity())).toEqual({
      id: 'voice-1',
      name: 'Warm Tutor',
      description: 'Bright and friendly',
      coverImage: 'https://cdn.example.com/cover.png',
      tags: ['female', 'teacher'],
      languages: ['en'],
      authorName: 'Echo',
      authorAvatar: 'https://cdn.example.com/avatar.png',
      sampleAudio: 'https://cdn.example.com/sample.mp3',
      sampleText: 'Hello from Fish Audio',
      likeCount: 42,
      taskCount: 15,
    });
  });

  it('handles missing optional fields with safe defaults', () => {
    const result = normalizeFishVoice(
      makeModelEntity({
        tags: undefined,
        languages: undefined,
        author: undefined,
        samples: undefined,
        like_count: undefined,
        task_count: undefined,
      }),
    );

    expect(result.tags).toEqual([]);
    expect(result.languages).toEqual([]);
    expect(result.authorName).toBe('Fish Audio');
    expect(result.authorAvatar).toBe('');
    expect(result.sampleAudio).toBe('');
    expect(result.sampleText).toBe('');
    expect(result.likeCount).toBe(0);
    expect(result.taskCount).toBe(0);
  });

  // --- listFishVoices ---

  it('lists and normalizes English Fish voices', async () => {
    searchMock.mockResolvedValue({
      items: [makeModelEntity({ _id: 'voice-1', title: 'Warm Tutor', tags: [], like_count: 0, task_count: 3 })],
    });

    const voices = await listFishVoices('fish-key', 'warm');

    expect(searchMock).toHaveBeenCalledWith({
      page_number: 1,
      page_size: 100,
      sort_by: 'task_count',
      language: 'en',
      title: 'warm',
    });
    expect(voices).toHaveLength(1);
    expect(voices[0]?.id).toBe('voice-1');
  });

  it('omits title when query is empty or whitespace', async () => {
    searchMock.mockResolvedValue({ items: [] });

    await listFishVoices('fish-key', '   ');

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: undefined }),
    );
  });

  it('omits title when no query is provided', async () => {
    searchMock.mockResolvedValue({ items: [] });

    await listFishVoices('fish-key');

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: undefined }),
    );
  });

  it('returns empty array when API returns no items', async () => {
    searchMock.mockResolvedValue({ items: [] });

    const voices = await listFishVoices('fish-key', 'nonexistent');

    expect(voices).toEqual([]);
  });

  it('propagates API errors from listFishVoices', async () => {
    searchMock.mockRejectedValue(new Error('Unauthorized'));

    await expect(listFishVoices('bad-key')).rejects.toThrow('Unauthorized');
  });

  // --- resolveTTSSource ---

  it('returns browser fallback when Fish is not fully configured', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'fish',
        hasFishCredentials: false,
        hasFishVoice: false,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Fish Audio is selected but no API key is configured.',
    });

    expect(
      resolveTTSSource({
        requestedSource: 'fish',
        hasFishCredentials: true,
        hasFishVoice: true,
        requiresBoundaryEvents: true,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Boundary-based highlighting still requires browser speech.',
    });
  });

  it('returns fish when credentials and voice are present', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'fish',
        hasFishCredentials: true,
        hasFishVoice: true,
      }),
    ).toEqual({ source: 'fish' });
  });

  it('falls back to browser when fish has credentials but no voice selected', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'fish',
        hasFishCredentials: true,
        hasFishVoice: false,
      }),
    ).toEqual({
      source: 'browser',
      reason: 'Fish Audio is selected but no cloud voice is chosen yet.',
    });
  });

  it('returns browser without reason when browser is the requested source', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'browser',
        hasFishCredentials: true,
        hasFishVoice: true,
      }),
    ).toEqual({ source: 'browser' });
  });

  it('returns browser without reason for boundary events when source is browser', () => {
    expect(
      resolveTTSSource({
        requestedSource: 'browser',
        hasFishCredentials: false,
        hasFishVoice: false,
        requiresBoundaryEvents: true,
      }),
    ).toEqual({ source: 'browser', reason: undefined });
  });

  // --- synthesizeFishSpeech ---

  it('synthesizes Fish speech and returns audio bytes plus content type', async () => {
    mockConvert('audio/mpeg', [1, 2, 3]);

    const result = await synthesizeFishSpeech({
      apiKey: 'fish-key',
      text: 'Hello there',
      voiceId: 'voice-1',
      model: 's2-pro',
      speed: 1.1,
    });

    expect(convertMock).toHaveBeenCalledWith(
      {
        text: 'Hello there',
        reference_id: 'voice-1',
        format: 'mp3',
        normalize: true,
        prosody: { speed: 1.1 },
      },
      's2-pro',
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(result.audioBuffer))).toEqual([1, 2, 3]);
  });

  it('uses default speed of 1 when speed is omitted', async () => {
    mockConvert();

    await synthesizeFishSpeech({
      apiKey: 'fish-key',
      text: 'Hello',
      voiceId: 'voice-1',
      model: 's2-pro',
    });

    expect(convertMock).toHaveBeenCalledWith(
      expect.objectContaining({ prosody: { speed: 1 } }),
      's2-pro',
    );
  });

  it('falls back to audio/mpeg when content-type header is missing', async () => {
    convertMock.mockReturnValue({
      withRawResponse: vi.fn().mockResolvedValue({
        data: makeStream(),
        rawResponse: {
          headers: new Headers(),
        },
      }),
    });

    const result = await synthesizeFishSpeech({
      apiKey: 'fish-key',
      text: 'Test',
      voiceId: 'voice-1',
      model: 's1',
    });

    expect(result.contentType).toBe('audio/mpeg');
  });

  it('propagates API errors from synthesizeFishSpeech', async () => {
    convertMock.mockReturnValue({
      withRawResponse: vi.fn().mockRejectedValue(new Error('Insufficient Balance')),
    });

    await expect(
      synthesizeFishSpeech({
        apiKey: 'fish-key',
        text: 'Hello',
        voiceId: 'voice-1',
        model: 's2-pro',
      }),
    ).rejects.toThrow('Insufficient Balance');
  });

  it('supports different Fish model IDs', async () => {
    for (const model of ['s2', 's1', 's1-mini'] as const) {
      convertMock.mockReset();
      mockConvert();
      await synthesizeFishSpeech({
        apiKey: 'key',
        text: 'test',
        voiceId: 'v1',
        model,
      });
      expect(convertMock).toHaveBeenCalledWith(expect.anything(), model);
    }
  });
});
