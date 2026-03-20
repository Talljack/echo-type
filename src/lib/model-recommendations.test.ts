import { describe, expect, it } from 'vitest';
import {
  createModelRecommendationKey,
  getModelRecommendationMeta,
  sortModelsByRecommendation,
} from './model-recommendations';
import type { ProviderModel, ProviderModelRecommendation } from './providers';

describe('model recommendations', () => {
  it('builds a stable cache key regardless of model order', () => {
    const first = createModelRecommendationKey([
      { id: 'b-model', name: 'B' },
      { id: 'a-model', name: 'A' },
    ]);
    const second = createModelRecommendationKey([
      { id: 'a-model', name: 'A' },
      { id: 'b-model', name: 'B' },
    ]);

    expect(first).toBe(second);
  });

  it('returns cached recommendation metadata for a model', () => {
    const recommendations: ProviderModelRecommendation[] = [
      { modelId: 'gpt-4o', label: 'Recommended', rank: 1, score: 96, reason: 'Best fit for tutoring' },
    ];

    expect(getModelRecommendationMeta(recommendations, 'gpt-4o')).toEqual({
      label: 'Recommended',
      rank: 1,
      score: 96,
      reason: 'Best fit for tutoring',
    });
    expect(getModelRecommendationMeta(recommendations, 'other-model')).toBeNull();
  });

  it('sorts LLM-recommended models before unranked models', () => {
    const models: ProviderModel[] = [
      { id: 'xiaomi/mimo-v2-pro', name: 'Xiaomi: MiMo-V2-Pro' },
      { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
      { id: 'openai/gpt-4.1-mini', name: 'OpenAI: GPT-4.1 Mini' },
    ];
    const recommendations: ProviderModelRecommendation[] = [
      { modelId: 'openai/gpt-4o', label: 'Recommended', rank: 1, score: 96, reason: 'Best fit' },
      { modelId: 'openai/gpt-4.1-mini', label: 'Recommended', rank: 2, score: 89, reason: 'Fast fallback' },
    ];

    const sorted = sortModelsByRecommendation(models, recommendations);

    expect(sorted.map((model) => model.id)).toEqual([
      'openai/gpt-4o',
      'openai/gpt-4.1-mini',
      'xiaomi/mimo-v2-pro',
    ]);
  });
});
