import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const fetchTranscriptMock = vi.fn();
const extractYouTubeVideoIdMock = vi.fn();
const extractYouTubeAudioUrlMock = vi.fn();
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
  extractYouTubeAudioUrl: extractYouTubeAudioUrlMock,
  extractYouTubeAudioCandidates: extractYouTubeAudioCandidatesMock,
  fetchYouTubeMetadata: fetchYouTubeMetadataMock,
  fetchYouTubeTranscript: fetchYouTubeTranscriptMock,
}));

describe('POST /api/tools/extract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fetchMock.mockReset();
    fetchTranscriptMock.mockReset();
    extractYouTubeVideoIdMock.mockReset();
    extractYouTubeAudioUrlMock.mockReset();
    extractYouTubeAudioCandidatesMock.mockReset();
    fetchYouTubeMetadataMock.mockReset();
    fetchYouTubeTranscriptMock.mockReset();
    process.env.VERCEL = '1';
    delete process.env.VERCEL_ENV;
    process.env.GROQ_API_KEY = 'gsk-platform';
  });

  it('falls back to AI transcription when a YouTube video has no captions', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=3rNqNvwNcrM';

    extractYouTubeVideoIdMock.mockReturnValue('3rNqNvwNcrM');
    fetchYouTubeMetadataMock.mockResolvedValue({ title: 'Captionless YouTube Video' });

    fetchTranscriptMock.mockRejectedValue(new Error('[YoutubeTranscript] Transcript is disabled'));
    fetchYouTubeTranscriptMock.mockRejectedValue(new Error('No captions available for this video'));
    extractYouTubeAudioUrlMock.mockResolvedValue({
      url: 'https://cdn.example.com/youtube-audio.m4a',
      contentLength: 3,
      durationMs: 2400,
    });

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
