import { describe, expect, it } from 'vitest';
import { makeWords } from './helpers';

describe('makeWords', () => {
  it('converts word tuples into content items', () => {
    const result = makeWords('test-book', 'beginner', [
      ['hello', 'Hello, how are you?'],
      ['world', 'The world is beautiful.'],
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      title: 'hello',
      text: 'Hello, how are you?',
      type: 'word',
      category: 'test-book',
      tags: ['test-book'],
      source: 'builtin',
      difficulty: 'beginner',
    });
  });

  it('sets correct difficulty for each level', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      const result = makeWords('book', difficulty, [['word', 'sentence']]);
      expect(result[0].difficulty).toBe(difficulty);
    }
  });

  it('returns empty array for empty input', () => {
    expect(makeWords('book', 'beginner', [])).toEqual([]);
  });

  it('uses bookId as category and tag', () => {
    const result = makeWords('my-vocab', 'advanced', [['term', 'A term.']]);
    expect(result[0].category).toBe('my-vocab');
    expect(result[0].tags).toEqual(['my-vocab']);
  });

  it('always sets type to word and source to builtin', () => {
    const result = makeWords('b', 'intermediate', [['a', 'b']]);
    expect(result[0].type).toBe('word');
    expect(result[0].source).toBe('builtin');
  });
});
