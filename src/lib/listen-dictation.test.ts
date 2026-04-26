import { describe, expect, it } from 'vitest';
import { scoreDictationAttempt } from '@/lib/listen-dictation';

describe('listen dictation', () => {
  it('passes a near-perfect attempt', () => {
    const result = scoreDictationAttempt('Can I get a latte please', 'Can I get a latte please');

    expect(result.passed).toBe(true);
    expect(result.accuracy).toBe(100);
  });

  it('fails a distant attempt', () => {
    const result = scoreDictationAttempt('Can I get a latte please', 'This is a totally different sentence');

    expect(result.passed).toBe(false);
    expect(result.accuracy).toBeLessThan(80);
  });
});
