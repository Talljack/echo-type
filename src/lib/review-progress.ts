export function getReviewProgressState(totalCount: number, remainingCount: number) {
  const total = Math.max(0, totalCount);
  const remaining = Math.max(0, Math.min(total, remainingCount));
  const completedCount = total - remaining;

  return {
    completedCount,
    percent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    showProgress: total > 0,
  };
}
