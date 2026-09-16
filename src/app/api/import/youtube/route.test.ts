import { beforeEach, describe, expect, it, vi } from 'vitest';

const extractYouTubeVideoIdMock = vi.fn();
const fetchYouTubeTranscriptFromSourcesMock = vi.fn();
const fetchTranscriptMock = vi.fn();

vi.mock('@/lib/youtube-transcript', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/youtube-transcript')>(),
  extractYouTubeVideoId: extractYouTubeVideoIdMock,
  fetchYouTubeTranscriptFromSources: fetchYouTubeTranscriptFromSourcesMock,
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: fetchTranscriptMock },
}));

describe('POST /api/import/youtube', () => {
  beforeEach(() => vi.clearAllMocks());
  it('preserves access denial instead of claiming captions are absent',async()=>{
    const {YouTubeSourceError}=await import('@/lib/youtube-transcript');
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockRejectedValue(new YouTubeSourceError('source_forbidden','YouTube denied access',403));
    const {POST}=await import('./route');
    const response=await POST(new Request('http://localhost',{method:'POST',body:JSON.stringify({url:'https://youtu.be/abc123'})}));
    expect(response.status).toBe(403);expect(await response.json()).toMatchObject({code:'source_forbidden'});
    expect(fetchTranscriptMock).not.toHaveBeenCalled();
  });

  it('rejects missing and malformed URLs', async () => {
    const { POST } = await import('./route');
    expect((await POST(new Request('http://localhost', { method: 'POST', body: '{}' }))).status).toBe(400);

    extractYouTubeVideoIdMock.mockReturnValue(null);
    expect(
      (
        await POST(
          new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ url: 'https://example.com/watch?v=nope' }),
          }),
        )
      ).status,
    ).toBe(400);
  });

  it('returns the existing response contract from direct extraction', async () => {
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockResolvedValue({
      segments: [{ text: 'Hello', start: 1.25, duration: 2.5 }],
    });
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtu.be/abc123' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      videoId: 'abc123',
      segments: [{ text: 'Hello', offset: 1250, duration: 2500 }],
      fullText: 'Hello',
      segmentCount: 1,
      timeUnit: 'milliseconds',
    });
    expect(fetchTranscriptMock).not.toHaveBeenCalled();
  });

  it('does not run an unbounded duplicate extractor after bounded sources are exhausted', async () => {
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockResolvedValue({ segments: [] });
    fetchTranscriptMock.mockRejectedValueOnce(new Error('no English')).mockResolvedValueOnce([
      { text: 'Fallback', offset: 1.36, duration: 2.54 },
    ]);
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtu.be/abc123' }),
      }),
    );

    expect(response.status).toBe(404);
    expect(fetchTranscriptMock).not.toHaveBeenCalled();
  });

  it('returns an actionable fallback when every transcript source is exhausted', async () => {
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockResolvedValue(null);
    fetchTranscriptMock.mockRejectedValue(new Error('no package captions'));
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtu.be/abc123' }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: 'no_transcript',
      error: 'No transcript available for this video',
      hint: expect.stringContaining('Paste text'),
    });
  });
});
