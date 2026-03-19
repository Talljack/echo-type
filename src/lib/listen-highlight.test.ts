import { describe, expect, it } from 'vitest';
import { estimateSentenceHighlightTimings, estimateSentenceWeight } from './listen-highlight';

describe('listen highlight timing estimation', () => {
  it('gives more time to sentences with digits and abbreviations', () => {
    const plain = estimateSentenceWeight({ text: 'I will arrive tomorrow morning.', wordCount: 5 });
    const weighted = estimateSentenceWeight({ text: 'I will arrive at 10:30 a.m. on U.S. Route 66.', wordCount: 10 });

    expect(weighted).toBeGreaterThan(plain);
  });

  it('gives more time to sentences with stronger pauses', () => {
    const plain = estimateSentenceWeight({ text: 'We should leave now.', wordCount: 4 });
    const paused = estimateSentenceWeight({ text: 'We should leave now, or we will miss the train; hurry up!', wordCount: 11 });

    expect(paused).toBeGreaterThan(plain);
  });

  it('allocates longer timings to heavier sentences while preserving order', () => {
    const timings = estimateSentenceHighlightTimings(
      [
        { text: 'Hello there.', wordCount: 2 },
        { text: 'Meet me at 10:30 a.m., please, near Gate 24.', wordCount: 9 },
        { text: 'Thanks.', wordCount: 1 },
      ],
      1,
    );

    expect(timings).toHaveLength(3);
    expect(timings[0].startMs).toBe(0);
    expect(timings[1].startMs).toBeGreaterThanOrEqual(timings[0].durationMs);
    expect(timings[2].startMs).toBeGreaterThanOrEqual(timings[1].startMs + timings[1].durationMs);
    expect(timings[1].durationMs).toBeGreaterThan(timings[0].durationMs);
    expect(timings[1].durationMs).toBeGreaterThan(timings[2].durationMs);
  });

  it('still gives each sentence a minimum visible highlight window', () => {
    const timings = estimateSentenceHighlightTimings(
      [
        { text: 'Hi.', wordCount: 1 },
        { text: 'OK.', wordCount: 1 },
        { text: 'Go.', wordCount: 1 },
      ],
      2,
    );

    expect(timings.every((timing) => timing.durationMs >= 900)).toBe(true);
  });
});
