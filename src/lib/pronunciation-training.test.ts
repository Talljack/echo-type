import { describe, expect, it } from 'vitest';
import { actualMetric, legacyPracticedIds, MINIMAL_PAIRS, parseAcousticAssessment, recognitionMatches, STUDIO_SOUNDS } from './pronunciation-training';

describe('pronunciation evidence boundaries', () => {
  it('keeps 48 teaching entries while explicitly distinguishing the four clusters', () => {
    expect(STUDIO_SOUNDS).toHaveLength(48);
    expect(new Set(STUDIO_SOUNDS.map((s) => s.id)).size).toBe(48);
    expect(STUDIO_SOUNDS.filter((s) => s.group === 'cluster')).toHaveLength(4);
    expect(STUDIO_SOUNDS.filter((s) => s.group === 'vowel')).toHaveLength(20);
    expect(STUDIO_SOUNDS.every((s) => s.tipZh && s.examples.length)).toBe(true);
    expect(MINIMAL_PAIRS.every((p) => STUDIO_SOUNDS.some((s) => s.id === p.soundId))).toBe(true);
  });
  it('recognizes exact normalized words without accepting a different minimal-pair word', () => {
    expect(recognitionMatches('ship', ' Ship. ')).toBe(true);
    expect(recognitionMatches('ship', 'sheep')).toBe(false);
    expect(recognitionMatches('thin', 'sin')).toBe(false);
    expect(recognitionMatches('', '')).toBe(false);
    expect(recognitionMatches('ship', 'a ship')).toBe(false);
  });
  it('never turns absent, string, infinite or out-of-range values into scores', () => {
    for (const value of [undefined, null, '80', NaN, Infinity, -1, 101]) expect(actualMetric(value)).toBeUndefined();
    expect(actualMetric(0)).toBe(0);
    expect(actualMetric(89.5)).toBe(89.5);
    const result = parseAcousticAssessment({ status: 'success', result: { overall: 83, words: [{ phonemes: [{ phoneme: 'ɪ', quality_score: 45 }, { phoneme: 'p' }, { phoneme: '', quality_score: 80 }] }] } });
    expect(result.overall).toBe(83);
    expect(result.fluency).toBeUndefined();
    expect(result.completeness).toBeUndefined();
    expect(result.phonemes).toEqual([{ phoneme: 'ɪ', score: 45 }]);
    expect(() => parseAcousticAssessment({ status: 'success', result: {} })).toThrow();
    expect(() => parseAcousticAssessment({ provider: 'ai', overallScore: 100 })).toThrow();
    expect(parseAcousticAssessment({ status: 'success', result: { words: [{ phonemes: [{ phoneme: 'ɪ', pronunciation: 44 }] }] } }).phonemes).toEqual([{ phoneme: 'ɪ', score: 44 }]);
  });
  it('preserves known legacy practiced ids without importing old inferred scores', () => {
    expect(legacyPracticedIds(JSON.stringify({ completed: ['ih', 'ih', 'long-a-ai', 'unknown', 4], attempts: { ih: { score: 100 } } }))).toEqual(['ih', 'long-a-ai']);
    expect(legacyPracticedIds('{broken')).toEqual([]);
    expect(legacyPracticedIds('null')).toEqual([]);
  });
});
