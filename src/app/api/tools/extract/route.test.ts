import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPlatformRateLimitState } from '@/lib/platform-provider';

const fetchMock = vi.fn();
const fetchTranscriptMock = vi.fn();
const extractYouTubeVideoIdMock = vi.fn();
const extractYouTubeAudioCandidatesMock = vi.fn();
const fetchYouTubeMetadataMock = vi.fn();
const fetchYouTubeTranscriptMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: fetchTranscriptMock,
  },
}));

vi.mock('@/lib/youtube-transcript', () => ({
  extractYouTubeVideoId: extractYouTubeVideoIdMock,
  extractYouTubeAudioCandidates: extractYouTubeAudioCandidatesMock,
  fetchYouTubeMetadata: fetchYouTubeMetadataMock,
  fetchYouTubeTranscript: fetchYouTubeTranscriptMock,
}));

describe('POST /api/tools/extract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resetPlatformRateLimitState();
    fetchMock.mockReset();
    fetchTranscriptMock.mockReset();
    extractYouTubeVideoIdMock.mockReset();
    extractYouTubeAudioCandidatesMock.mockReset();
    fetchYouTubeMetadataMock.mockReset();
    fetchYouTubeTranscriptMock.mockReset();
    process.env.VERCEL = '1';
    delete process.env.VERCEL_ENV;
    process.env.GROQ_API_KEY = 'gsk-platform';
  });

  it('falls back from groq to openai transcription when groq is rate limited', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=provider-fallback';

    extractYouTubeVideoIdMock.mockReturnValue('provider-fallback');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Provider Fallback' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/fallback.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
        durationMs: 2100,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'rate limited' },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'rate limited' },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered via OpenAI.',
            language: 'en',
            segments: [{ start: 0, end: 2.1, text: 'Recovered via OpenAI.' }],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-key': 'sk-platform',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe('Recovered via OpenAI.');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      transcriptSource: 'stt-openai',
      degraded: true,
      partial: false,
      warnings: ['groq: rate limited'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://cdn.example.com/fallback.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk-platform',
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk-platform',
        },
      }),
    );
  });

  it('continues to openai after a non-retryable groq failure when openai is available', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=provider-fallback-nonretryable';

    extractYouTubeVideoIdMock.mockReturnValue('provider-fallback-nonretryable');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Provider Fallback Nonretryable' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/nonretryable.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
        durationMs: 1900,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Unauthorized provider failure' },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered after auth failure.',
            language: 'en',
            segments: [{ start: 0, end: 1.9, text: 'Recovered after auth failure.' }],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openai-key': 'sk-platform',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe('Recovered after auth failure.');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      transcriptSource: 'stt-openai',
      degraded: true,
      partial: false,
      warnings: ['groq: Unauthorized provider failure'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk-platform',
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk-platform',
        },
      }),
    );
  });

  it('falls back to AI transcription when a YouTube video has no captions', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=3rNqNvwNcrM';

    extractYouTubeVideoIdMock.mockReturnValue('3rNqNvwNcrM');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Captionless YouTube Video' });

    fetchTranscriptMock.mockRejectedValue(new Error('[YoutubeTranscript] Transcript is disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('No captions available for this video'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/youtube-audio.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
        durationMs: 2400,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered transcript from audio fallback.',
            language: 'en',
            segments: [{ start: 0, end: 2.4, text: 'Recovered transcript from audio fallback.' }],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      title: 'Captionless YouTube Video',
      text: 'Recovered transcript from audio fallback.',
      platform: 'youtube',
      sourceUrl: videoUrl,
      videoDuration: 2.4,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://cdn.example.com/youtube-audio.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk-platform',
        },
      }),
    );
  });

  it('returns structured failure after all downloaded candidates fail transcription', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=provider-failure';

    extractYouTubeVideoIdMock.mockReturnValue('provider-failure');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Provider Failure' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/first.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
        durationMs: 2400,
      },
      {
        url: 'https://cdn.example.com/second.m4a',
        mimeType: 'audio/mp4',
        bitrate: 96000,
        contentLength: 3,
        durationMs: 2400,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Unauthorized provider failure' },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([4, 5, 6]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Second candidate provider failure' },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Second candidate provider failure');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      code: 'transcription_upstream_failed',
      warnings: ['groq: Unauthorized provider failure', 'groq: Second candidate provider failure'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://cdn.example.com/first.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk-platform',
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://cdn.example.com/second.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk-platform',
        },
      }),
    );
  });

  it('continues to the next downloaded candidate after transcription failure and preserves warnings on success', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=transcription-retry-next-candidate';

    extractYouTubeVideoIdMock.mockReturnValue('transcription-retry-next-candidate');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Transcription Retry Next Candidate' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/first-transcription-fail.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
        durationMs: 2400,
      },
      {
        url: 'https://cdn.example.com/second-transcription-win.m4a',
        mimeType: 'audio/mp4',
        bitrate: 96000,
        contentLength: 3,
        durationMs: 2400,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Unauthorized provider failure' },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([4, 5, 6]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered from second downloaded candidate.',
            language: 'en',
            segments: [{ start: 0, end: 2, text: 'Recovered from second downloaded candidate.' }],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe('Recovered from second downloaded candidate.');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      transcriptSource: 'stt-groq',
      degraded: true,
      partial: false,
      warnings: ['groq: Unauthorized provider failure'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://cdn.example.com/first-transcription-fail.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://cdn.example.com/second-transcription-win.m4a',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns structured extraction failure metadata when no audio candidates exist', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=no-audio-candidates';

    extractYouTubeVideoIdMock.mockReturnValue('no-audio-candidates');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'No Audio Candidates' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([]);

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('No downloadable audio stream available for this video');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      degraded: true,
      partial: false,
      code: 'audio_stream_unavailable',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves extractor errors instead of converting them into missing-audio failures', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=extractor-timeout';

    extractYouTubeVideoIdMock.mockReturnValue('extractor-timeout');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Extractor Timeout' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockRejectedValue(new Error('extractor timeout'));

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('extractor timeout');
    expect(data.error).not.toContain('No downloadable audio stream available for this video');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns captions metadata when transcript extraction succeeds before audio fallback', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=captions-ok';

    extractYouTubeVideoIdMock.mockReturnValue('captions-ok');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Captions Win' });
    fetchTranscriptMock.mockResolvedValue([
      { text: 'Hello world', offset: 0, duration: 1200 },
    ]);

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.extractionMeta).toEqual({
      mode: 'captions',
      transcriptSource: 'npm-en',
      degraded: false,
      partial: false,
      warnings: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data).toMatchObject({
      title: 'Captions Win',
      text: 'Hello world',
      platform: 'youtube',
      sourceUrl: videoUrl,
      videoDuration: 1.2,
    });
  });

  it('retries a second audio candidate after the first one fails', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=audio-candidates';

    extractYouTubeVideoIdMock.mockReturnValue('audio-candidates');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Candidate Retry' });
    fetchTranscriptMock.mockRejectedValue(new Error('captions disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('no captions'));
    extractYouTubeAudioCandidatesMock.mockResolvedValue([
      {
        url: 'https://cdn.example.com/first.m4a',
        mimeType: 'audio/mp4',
        bitrate: 128000,
        contentLength: 3,
      },
      {
        url: 'https://cdn.example.com/second.m4a',
        mimeType: 'audio/mp4',
        bitrate: 96000,
        contentLength: 3,
      },
    ]);

    fetchMock
      .mockResolvedValueOnce(
        new Response('gone', {
          status: 403,
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mp4',
            'Content-Length': '3',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: 'Recovered from second candidate.',
            language: 'en',
            segments: [{ start: 0, end: 2, text: 'Recovered from second candidate.' }],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

    const { NextRequest } = await import('next/server');
    const { POST } = await import('./route');

    const response = await POST(
      new NextRequest('http://localhost/api/tools/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toBe('Recovered from second candidate.');
    expect(data.extractionMeta).toMatchObject({
      mode: 'audio-transcription',
      degraded: true,
      warnings: ['Failed to fetch YouTube audio: 403'],
    });
    expect(extractYouTubeAudioCandidatesMock).toHaveBeenCalledWith('audio-candidates');
    const attemptedUrls = fetchMock.mock.calls.map(([url]) => url);
    const firstAudioIndex = attemptedUrls.indexOf('https://cdn.example.com/first.m4a');
    const secondAudioIndex = attemptedUrls.indexOf('https://cdn.example.com/second.m4a');
    const transcriptionIndex = attemptedUrls.indexOf('https://api.groq.com/openai/v1/audio/transcriptions');

    expect(firstAudioIndex).toBeGreaterThan(-1);
    expect(secondAudioIndex).toBeGreaterThan(firstAudioIndex);
    expect(transcriptionIndex).toBeGreaterThan(secondAudioIndex);
  });
});
