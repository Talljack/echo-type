import type { PlanTask } from '@/stores/daily-plan-store';

export function getTaskHref(task: PlanTask): string {
  if (task.type === 'review') {
    return '/review/today';
  }

  if (task.bookId) return `/${task.module}/book/${task.bookId}`;
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
