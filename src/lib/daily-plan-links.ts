import type { PlanTask } from '@/stores/daily-plan-store';

export function getTaskHref(task: PlanTask): string {
  if (task.type === 'review') {
    return '/review/today';
  }

  if (task.bookId) {
    const base = `/${task.module}/book/${task.bookId}`;
    // Use explicit limit, or extract from title for older plans (e.g. "Learn 20 new words")
    const limit = task.limit ?? (task.type === 'new-words' ? Number(task.title.match(/\d+/)?.[0]) || 0 : 0);
    return limit > 0 ? `${base}?limit=${limit}` : base;
  }
  if (task.contentId) return `/${task.module}/${task.contentId}`;
  return `/${task.module}`;
}

export function getReviewItemHref(item: { module: PlanTask['module']; contentId?: string; bookId?: string }): string {
  if (item.module === 'speak' && item.bookId) {
    return `/speak/book/${item.bookId}`;
  }

  if (item.contentId) {
    return `/${item.module}/${item.contentId}`;
  }

  if (item.bookId) {
    return `/${item.module}/book/${item.bookId}`;
  }

  return `/${item.module}`;
}
