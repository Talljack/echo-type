import { describe, expect, it } from 'vitest';
import { diffDictation, normalizeDictationWord } from './dictation-diff';
import { formatClock, segmentAtTime, segmentCues, segmentsForLesson, segmentText } from './lesson-segments';

describe('segmentCues', () => {
  it('merges unpunctuated caption fragments and closes on pauses', () => {
    const segments = segmentCues([
      { offset: 0, duration: 1.2, text: 'so today we are' },
      { offset: 1.2, duration: 1.1, text: 'going to talk about' },
      { offset: 2.3, duration: 1, text: 'memory' },
      { offset: 4.5, duration: 1.5, text: 'and why we forget' },
      { offset: 6, duration: 1.2, text: 'things so quickly' },
    ]);
    expect(segments.map((segment) => segment.text)).toEqual([
      'so today we are going to talk about memory',
      'and why we forget things so quickly',
    ]);
    expect(segments[0]).toMatchObject({ start: 0 });
    expect(segments[0].end).toBeCloseTo(3.3);
    expect(segments[1].start).toBe(4.5);
  });

  it('closes on sentence punctuation and drops sound tags', () => {
    const segments = segmentCues([
      { offset: 0, duration: 2, text: '[Music]' },
      { offset: 2, duration: 2, text: 'Most people think memory is a recording.' },
      { offset: 4, duration: 2, text: 'It is not.' },
      { offset: 6, duration: 2, text: 'Every recall rebuilds it.' },
    ]);
    expect(segments.map((segment) => segment.text)).toEqual([
      'Most people think memory is a recording.',
      'It is not. Every recall rebuilds it.',
    ]);
  });

  it('never lets a segment run into the next one', () => {
    const segments = segmentCues([
      { offset: 0, duration: 5, text: 'The first sentence ends here.' },
      { offset: 3, duration: 4, text: 'The second one overlaps the first.' },
    ]);
    expect(segments[0].end).toBe(3);
  });
});

describe('segmentText', () => {
  it('splits paragraphs and sentences, keeping headings separate', () => {
    expect(segmentText('Chapter 1\n\nIt was late. Mr. Smith was tired!\nWhy?')).toEqual([
      'Chapter 1',
      'It was late.',
      'Mr. Smith was tired!',
      'Why?',
    ]);
  });

  it('splits very long sentences near the middle comma', () => {
    const long = `${Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')}, ${Array.from({ length: 20 }, (_, i) => `x${i}`).join(' ')}.`;
    const parts = segmentText(long);
    expect(parts).toHaveLength(2);
    expect(parts[0].endsWith('w19,')).toBe(true);
  });
});

describe('segmentsForLesson', () => {
  it('indexes segments across exercises and keeps timings', () => {
    const base = { title: 't', type: 'article' as const, tags: [], source: 'imported' as const, createdAt: 0, updatedAt: 0 };
    const segments = segmentsForLesson([
      { ...base, id: 'a', text: 'One two three four. Five six seven eight.' },
      {
        ...base,
        id: 'b',
        text: 'ignored',
        metadata: { timestamps: [{ offset: 10, duration: 2, text: 'Hello there my friend.' }] },
      },
    ]);
    expect(segments.map((segment) => [segment.id, segment.index, segment.start])).toEqual([
      ['a#0', 0, undefined],
      ['a#1', 1, undefined],
      ['b#0', 2, 10],
    ]);
  });
});

describe('segmentAtTime / formatClock', () => {
  const segments = [0, 4, 9].map((start, index) => ({ id: String(index), index, itemId: 'x', text: 't', start }));
  it('finds the active segment by start time', () => {
    expect(segmentAtTime(segments, -1)).toBe(-1);
    expect(segmentAtTime(segments, 0)).toBe(0);
    expect(segmentAtTime(segments, 5)).toBe(1);
    expect(segmentAtTime(segments, 100)).toBe(2);
  });
  it('formats clock times', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(undefined)).toBe('');
  });
});

describe('diffDictation', () => {
  it('ignores case and punctuation', () => {
    const result = diffDictation('Well, it’s 2019 — isn’t it?', "well its 2019 isn't it");
    expect(result.tokens.map((token) => token.accuracy)).toEqual(['correct', 'close', 'correct', 'correct', 'correct']);
    expect(normalizeDictationWord('It’s')).toBe("it's");
  });

  it('marks missing, wrong and extra words', () => {
    const result = diffDictation('The cat sat on the mat', 'the dog sat on mat today');
    expect(result.tokens.map((token) => [token.text, token.accuracy])).toEqual([
      ['The', 'correct'],
      ['cat', 'wrong'],
      ['sat', 'correct'],
      ['on', 'correct'],
      ['the', 'missing'],
      ['mat', 'correct'],
      ['today', 'extra'],
    ]);
    expect(result.perfect).toBe(false);
    expect(result.accuracy).toBe(67);
  });

  it('reports a perfect answer', () => {
    expect(diffDictation('Practice beats rereading.', 'practice beats rereading').perfect).toBe(true);
    expect(diffDictation('Hello', '').accuracy).toBe(0);
  });
});
