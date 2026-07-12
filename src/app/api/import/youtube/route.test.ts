import { beforeEach, describe, expect, it, vi } from 'vitest';

const extractYouTubeVideoIdMock = vi.fn();
const fetchYouTubeTranscriptFromSourcesMock = vi.fn();
const fetchTranscriptMock = vi.fn();

vi.mock('@/lib/youtube-transcript', () => ({
  extractYouTubeVideoId: extractYouTubeVideoIdMock,
  fetchYouTubeTranscriptFromSources: fetchYouTubeTranscriptFromSourcesMock,
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: fetchTranscriptMock },
}));

describe('POST /api/import/youtube', () => {
  beforeEach(() => vi.clearAllMocks());

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
    });
    expect(fetchTranscriptMock).not.toHaveBeenCalled();
  });

  it('falls back to the installed package when direct sources are exhausted', async () => {
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockResolvedValue({ segments: [] });
    fetchTranscriptMock.mockRejectedValueOnce(new Error('no English')).mockResolvedValueOnce([
      { text: 'Fallback', offset: 10, duration: 20 },
    ]);
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtu.be/abc123' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchTranscriptMock).toHaveBeenNthCalledWith(1, 'abc123', { lang: 'en' });
    expect(fetchTranscriptMock).toHaveBeenNthCalledWith(2, 'abc123');
  });

  it('returns 404 when every transcript source is exhausted', async () => {
    extractYouTubeVideoIdMock.mockReturnValue('abc123');
    fetchYouTubeTranscriptFromSourcesMock.mockRejectedValue(new Error('no direct captions'));
    fetchTranscriptMock.mockRejectedValue(new Error('no package captions'));
    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://youtu.be/abc123' }),
      }),
    );

    expect(response.status).toBe(404);
  });
});
