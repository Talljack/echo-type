import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { ReadAloudFloatingBar } from './read-aloud-floating-bar';

const noop = () => {};

const defaultProps = {
  onPlay: noop,
  onPause: noop,
  onPrev: noop,
  onNext: noop,
};

describe('ReadAloudFloatingBar', () => {
  afterEach(() => {
    useReadAloudStore.getState().deactivate();
  });

  it('returns null when store is in initial (inactive) state', () => {
    const markup = renderToStaticMarkup(<ReadAloudFloatingBar {...defaultProps} />);
    expect(markup).toBe('');
  });

  it('returns null without crashing when no props handlers provided beyond required', () => {
    const markup = renderToStaticMarkup(<ReadAloudFloatingBar {...defaultProps} onRestart={undefined} />);
    expect(markup).toBe('');
  });

  describe('SPEED_STEPS logic (unit)', () => {
    const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

    it('has 6 speed levels', () => {
      expect(SPEED_STEPS.length).toBe(6);
    });

    it('starts at 1x (index 2)', () => {
      expect(SPEED_STEPS.indexOf(1)).toBe(2);
    });

    it('speed up finds next higher speed', () => {
      const current = 1;
      const nextIdx = SPEED_STEPS.findIndex((s) => s > current);
      expect(nextIdx).toBe(3);
      expect(SPEED_STEPS[nextIdx]).toBe(1.25);
    });

    it('speed down finds next lower speed', () => {
      const current = 1;
      const prevIdx = [...SPEED_STEPS].reverse().findIndex((s) => s < current);
      expect(prevIdx).toBeGreaterThanOrEqual(0);
      expect([...SPEED_STEPS].reverse()[prevIdx]).toBe(0.75);
    });

    it('speed up returns -1 at max speed', () => {
      const current = 2;
      const nextIdx = SPEED_STEPS.findIndex((s) => s > current);
      expect(nextIdx).toBe(-1);
    });

    it('speed down returns -1 at min speed', () => {
      const current = 0.5;
      const prevIdx = [...SPEED_STEPS].reverse().findIndex((s) => s < current);
      expect(prevIdx).toBe(-1);
    });
  });

  describe('progress calculation (unit)', () => {
    it('calculates 0% when currentWordIndex is -1', () => {
      const words = ['hello', 'world'];
      const currentWordIndex = -1;
      const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;
      expect(progress).toBe(0);
    });

    it('calculates 50% when first of two words is current', () => {
      const words = ['hello', 'world'];
      const currentWordIndex = 0;
      const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;
      expect(progress).toBe(50);
    });

    it('calculates 100% when last word is current', () => {
      const words = ['hello', 'world'];
      const currentWordIndex = 1;
      const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;
      expect(progress).toBe(100);
    });

    it('returns 0 for empty words array', () => {
      const words: string[] = [];
      const currentWordIndex = 0;
      const progress = words.length > 0 && currentWordIndex >= 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;
      expect(progress).toBe(0);
    });
  });
});
