import { describe, expect, it } from 'vitest';
import { getReviewProgressState } from './review-progress';

describe('getReviewProgressState', () => {
  it('does not report a 0/0 review queue as 100% complete', () => {
    expect(getReviewProgressState(0, 0)).toEqual({ completedCount: 0, percent: 0, showProgress: false });
  });

  it('reports progress only when there was work in the queue', () => {
    expect(getReviewProgressState(4, 1)).toEqual({ completedCount: 3, percent: 75, showProgress: true });
  });
});
