import { describe, expect, it } from 'vitest';
import { buildProgressiveWordResults } from './levenshtein';

describe('buildProgressiveWordResults', () => {
  it('only scores the consumed prefix and leaves unread words pending', () => {
    const results = buildProgressiveWordResults(['My', 'best', 'friend', 'is'], ['My', 'best']);

    expect(results.map((result) => result.accuracy)).toEqual(['correct', 'correct', 'pending', 'pending']);
  });

  it('keeps close and wrong states aligned with compareWords semantics', () => {
    const results = buildProgressiveWordResults(['Sarah', 'rides'], ['Sara', 'x']);

    expect(results[0].accuracy).toBe('close');
    expect(results[1].accuracy).toBe('wrong');
  });
});
