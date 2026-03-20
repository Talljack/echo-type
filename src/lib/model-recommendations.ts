import type { ProviderModel, ProviderModelRecommendation } from './providers';

export interface ModelRecommendationMeta {
  label: 'Recommended';
  reason: string;
  score: number;
  rank: number;
}

export function createModelRecommendationKey(models: ProviderModel[]): string {
  return models
    .map((model) => model.id)
    .filter(Boolean)
    .sort()
    .join('|');
}

export function getModelRecommendationMeta(
  recommendations: ProviderModelRecommendation[] | undefined,
  modelId: string,
): ModelRecommendationMeta | null {
  const recommendation = recommendations?.find((item) => item.modelId === modelId);
  if (!recommendation) return null;

  return {
    label: recommendation.label,
    reason: recommendation.reason,
    score: recommendation.score,
    rank: recommendation.rank,
  };
}

export function sortModelsByRecommendation(
  models: ProviderModel[],
  recommendations: ProviderModelRecommendation[] | undefined,
): ProviderModel[] {
  return [...models].sort((left, right) => {
    const leftMeta = getModelRecommendationMeta(recommendations, left.id);
    const rightMeta = getModelRecommendationMeta(recommendations, right.id);

    const leftRank = leftMeta?.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = rightMeta?.rank ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftScore = leftMeta?.score ?? Number.NEGATIVE_INFINITY;
    const rightScore = rightMeta?.score ?? Number.NEGATIVE_INFINITY;
    if (leftScore !== rightScore) return rightScore - leftScore;

    return (left.name ?? left.id).localeCompare(right.name ?? right.id);
  });
}
