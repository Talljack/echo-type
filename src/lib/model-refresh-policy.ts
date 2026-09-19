export function shouldEvaluateModelRecommendations({
  explicitlyRequested,
  modelCount,
}: {
  explicitlyRequested: boolean;
  modelCount: number;
}): boolean {
  return explicitlyRequested && modelCount > 0;
}
