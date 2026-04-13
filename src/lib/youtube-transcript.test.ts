import { describe, expect, it } from 'vitest';

describe('sortAudioCandidates', () => {
  it('orders valid audio candidates by bitrate and filters missing URLs', async () => {
    const youtubeTranscript = await import('./youtube-transcript');
    expect(youtubeTranscript).toHaveProperty('sortAudioCandidates');

    const sortAudioCandidates = Reflect.get(youtubeTranscript, 'sortAudioCandidates');

    const result = sortAudioCandidates([
      { url: '', mimeType: 'audio/mp4', bitrate: 192000 },
      { url: 'https://cdn.example.com/low.m4a', mimeType: 'audio/mp4', bitrate: 64000 },
      { url: 'https://cdn.example.com/high.m4a', mimeType: 'audio/mp4', bitrate: 128000 },
    ]);

    expect(
      result.map((candidate: { url: string; mimeType: string; bitrate: number }) => candidate.url),
    ).toEqual([
      'https://cdn.example.com/high.m4a',
      'https://cdn.example.com/low.m4a',
    ]);
  });
});
