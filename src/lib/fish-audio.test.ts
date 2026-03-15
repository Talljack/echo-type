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

describe('fish-audio helpers', () => {
  beforeEach(() => {
    searchMock.mockReset();
    convertMock.mockReset();
  });

  it('normalizes Fish model payloads for the client', () => {
    expect(
      normalizeFishVoice({
        _id: 'voice-1',
        type: 'tts',
        title: 'Warm Tutor',
        description: 'Bright and friendly',
        cover_image: 'https://cdn.example.com/cover.png',
        state: 'trained',
        tags: ['female', 'teacher'],
        created_at: '2026-03-01',
        updated_at: '2026-03-02',
        visibility: 'public',
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
      }),
    ).toEqual({
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

  it('lists and normalizes English Fish voices', async () => {
    searchMock.mockResolvedValue({
      items: [
        {
          _id: 'voice-1',
          type: 'tts',
          title: 'Warm Tutor',
          description: '',
          cover_image: '',
          state: 'trained',
          tags: [],
          created_at: '2026-03-01',
          updated_at: '2026-03-02',
          visibility: 'public',
          like_count: 0,
          mark_count: 0,
          shared_count: 0,
          task_count: 3,
          author: { _id: 'author-1', nickname: 'Echo', avatar: '' },
        },
      ],
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

  it('synthesizes Fish speech and returns audio bytes plus content type', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });

    convertMock.mockReturnValue({
      withRawResponse: vi.fn().mockResolvedValue({
        data: stream,
        rawResponse: {
          headers: new Headers({ 'content-type': 'audio/mpeg' }),
        },
      }),
    });

    const result = await synthesizeFishSpeech({
      apiKey: 'fish-key',
      text: 'Hello there',
      voiceId: 'voice-1',
      model: 'speech-1.6',
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
      'speech-1.6',
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(result.audioBuffer))).toEqual([1, 2, 3]);
  });
});
