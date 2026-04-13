import { describe, expect, it } from 'vitest';
import * as youtubeTranscript from './youtube-transcript';

const sortAudioCandidates = (
  youtubeTranscript as unknown as {
    sortAudioCandidates: (
      candidates: Array<{ url: string; mimeType: string; bitrate: number }>,
    ) => Array<{ url: string; mimeType: string; bitrate: number }>;
  }
).sortAudioCandidates;

describe('sortAudioCandidates', () => {
  it('orders valid audio candidates by bitrate and filters missing URLs', () => {
    const result = sortAudioCandidates([
      { url: '', mimeType: 'audio/mp4', bitrate: 192000 },
      { url: 'https://cdn.example.com/low.m4a', mimeType: 'audio/mp4', bitrate: 64000 },
      { url: 'https://cdn.example.com/high.m4a', mimeType: 'audio/mp4', bitrate: 128000 },
    ]);

    expect(result.map((candidate) => candidate.url)).toEqual([
      'https://cdn.example.com/high.m4a',
      'https://cdn.example.com/low.m4a',
    ]);
  });
});
