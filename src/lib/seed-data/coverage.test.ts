import { describe, expect, it } from 'vitest';
import { builtinArticles } from './articles';
import { builtinPhrases } from './phrases';
import { builtinSentences } from './sentences';
import { builtinWords } from './words';

describe('builtin Library content', () => {
  it('ships all four content types for a first-run Library', () => {
    expect(builtinWords.length).toBeGreaterThan(0);
    expect(builtinPhrases.length).toBeGreaterThan(0);
    expect(builtinSentences.length).toBeGreaterThan(0);
    expect(builtinArticles.length).toBeGreaterThan(0);
  });
});
