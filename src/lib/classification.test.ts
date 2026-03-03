import { describe, expect, it } from 'vitest';
import { heuristicClassifyContent, normalizeClassificationResult } from './classification';

describe('classification', () => {
  it('normalizes AI output into the expected fields', () => {
    const result = normalizeClassificationResult(
      {
        type: 'sentence',
        difficulty: 'intermediate',
        title: 'Travel Phrases',
        tags: ['travel', 'speaking'],
      },
      'Where is the station? How much is the ticket?',
      'Ignored title',
    );

    expect(result).toEqual({
      type: 'sentence',
      difficulty: 'intermediate',
      title: 'Travel Phrases',
      tags: ['travel', 'speaking'],
    });
  });

  it('falls back to local heuristics when no provider output is available', () => {
    const result = heuristicClassifyContent('apple - a fruit\nbook - something you read', '');

    expect(result.type).toBe('word');
    expect(result.title).toBeTruthy();
    expect(result.tags.length).toBeGreaterThan(0);
  });
});
