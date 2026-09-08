import { describe, expect, it } from 'vitest';
import { parseSpeechSuperResponse } from './speechsuper';

describe('legacy SpeechSuper adapter with partial acoustic responses', () => {
  it('retains documented phoneme pronunciation scores without inventing missing word or sentence scores', () => {
    const result = parseSpeechSuperResponse({ status: 'success', result: { words: [{ word: 'ship', phonemes: [{ phoneme: 'ɪ', pronunciation: 44.5 }] }] } });
    expect(result.overallScore).toBeUndefined();
    expect(result.fluencyScore).toBeUndefined();
    expect(result.completenessScore).toBeUndefined();
    expect(result.words[0].score).toBeUndefined();
    expect(result.words[0].phonemes?.[0]).toMatchObject({ phoneme: 'ɪ', score: 44.5 });
    expect(result.tips).toHaveLength(1);
    expect(result.tips[0]).toContain('/ɪ/');
  });
  it('preserves valid legacy aliases, including real zeroes, and ignores invalid metrics', () => {
    const result = parseSpeechSuperResponse({ status: 'success', result: { overall: 0, fluency: NaN, integrity: -1, words: [{ word: 'ship', quality_score: 80, phonemes: [{ phoneme: 'ʃ', quality_score: 91 }, { phoneme: 'p', quality_score: Infinity }, { phoneme: 'ɪ' }] }] } });
    expect(result.overallScore).toBe(0);
    expect(result.fluencyScore).toBeUndefined();
    expect(result.completenessScore).toBeUndefined();
    expect(result.words[0].score).toBe(80);
    expect(result.words[0].phonemes).toHaveLength(1);
    expect(result.words[0].phonemes?.[0].score).toBe(91);
    expect(result.tips).toEqual([]);
    expect(() => parseSpeechSuperResponse({ status: 'success', result: {} })).toThrow('no supported acoustic metrics');
  });
});
