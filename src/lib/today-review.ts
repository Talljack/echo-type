import { getReviewItemHref } from '@/lib/daily-plan-links';
import { db } from '@/lib/db';
import type { ContentItem, LearningRecord } from '@/types/content';

export interface TodayReviewItem {
  id: string;
  recordId: string;
  contentId: string;
  content: ContentItem;
  module: LearningRecord['module'];
  bookId?: string;
  title: string;
  subtitle: string;
  accuracy: number;
  attempts: number;
  nextReview?: number;
  href: string;
}

export function buildTodayReviewItems(
  records: LearningRecord[],
  contents: ContentItem[],
  now: number = Date.now(),
): TodayReviewItem[] {
  const contentsById = new Map(contents.map((content) => [content.id, content]));

  return [...records]
    .filter((record) => typeof record.nextReview === 'number' && record.nextReview <= now)
    .flatMap((record) => {
      const content = contentsById.get(record.contentId);
      if (!content) return [];

      const bookId = content.category;
      return [
        {
          id: `${record.id}:${record.module}`,
          recordId: record.id,
          contentId: record.contentId,
          content,
          module: record.module,
          bookId,
          title: content.title,
          subtitle: `${labelForModule(record.module)} review · ${record.accuracy}% accuracy · ${record.attempts} attempts`,
          accuracy: record.accuracy,
          attempts: record.attempts,
          nextReview: record.nextReview,
          href: getReviewItemHref({
            module: record.module,
            contentId: record.contentId,
            bookId,
          }),
        } satisfies TodayReviewItem,
      ];
    })
    .sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return (a.nextReview ?? 0) - (b.nextReview ?? 0);
    });
}

export async function getTodayReviewItems(now: number = Date.now()): Promise<TodayReviewItem[]> {
  const [records, contents] = await Promise.all([db.records.toArray(), db.contents.toArray()]);
  return buildTodayReviewItems(records, contents, now);
}

function labelForModule(module: LearningRecord['module']): string {
  switch (module) {
    case 'listen':
      return 'Listen';
    case 'speak':
      return 'Speak';
    case 'read':
      return 'Read';
    case 'write':
      return 'Write';
    default:
      return module;
  }
}
