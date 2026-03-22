import { describe, expect, it } from 'vitest';
import { shouldAutoCollectByLookup, shouldAutoCollectByWriteErrors } from '../auto-collect';

describe('auto-collect', () => {
  describe('shouldAutoCollectByLookup', () => {
    it('returns true when lookup count meets medium threshold', () => {
      expect(shouldAutoCollectByLookup(3, 'medium')).toBe(true);
    });

    it('returns false below threshold', () => {
      expect(shouldAutoCollectByLookup(2, 'medium')).toBe(false);
    });

    it('respects high sensitivity', () => {
      expect(shouldAutoCollectByLookup(2, 'high')).toBe(true);
      expect(shouldAutoCollectByLookup(1, 'high')).toBe(false);
    });

    it('respects low sensitivity', () => {
      expect(shouldAutoCollectByLookup(5, 'low')).toBe(true);
      expect(shouldAutoCollectByLookup(4, 'low')).toBe(false);
    });
  });

  describe('shouldAutoCollectByWriteErrors', () => {
    it('returns true at medium threshold', () => {
      expect(shouldAutoCollectByWriteErrors(0.5, 'medium')).toBe(true);
    });

    it('returns false below threshold', () => {
      expect(shouldAutoCollectByWriteErrors(0.49, 'medium')).toBe(false);
    });
  });
});
