import { describe, expect, it } from 'vitest';
import { shouldEvaluateModelRecommendations } from './model-refresh-policy';

describe('shouldEvaluateModelRecommendations', () => {
  it('does not make a paid AI request merely because the user fetched a model list', () => {
    expect(shouldEvaluateModelRecommendations({ explicitlyRequested: false, modelCount: 3 })).toBe(false);
  });

  it('only evaluates a non-empty list after an explicit user request', () => {
    expect(shouldEvaluateModelRecommendations({ explicitlyRequested: true, modelCount: 0 })).toBe(false);
    expect(shouldEvaluateModelRecommendations({ explicitlyRequested: true, modelCount: 3 })).toBe(true);
  });
});
