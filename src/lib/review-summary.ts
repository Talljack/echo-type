import { buildTodayReviewItems } from '@/lib/today-review';
import type { ContentItem, LearningRecord } from '@/types/content';
import type { FavoriteItem } from '@/types/favorite';

export function reviewSummary(
  records: LearningRecord[],
  contents: ContentItem[],
  favorites: FavoriteItem[],
  weakSpots: { resolved: boolean }[],
  now = Date.now(),
) {
  return {
    lessons: buildTodayReviewItems(records, contents, now).length,
    notes: favorites.filter((f) => f.nextReview != null && f.nextReview <= now).length,
    weakSpots: weakSpots.filter((w) => !w.resolved).length,
  };
}
