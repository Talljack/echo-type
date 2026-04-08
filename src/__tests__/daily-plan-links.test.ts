import { describe, expect, it } from 'vitest';
import { getTaskHref } from '@/lib/daily-plan-links';
import type { PlanTask } from '@/stores/daily-plan-store';

function makeTask(overrides: Partial<PlanTask> = {}): PlanTask {
  return {
    id: 'task-1',
    type: 'new-words',
    title: 'Task',
    description: 'Description',
    module: 'write',
    completed: false,
    skipped: false,
    ...overrides,
  };
}

describe('getTaskHref', () => {
  it('routes dashboard review tasks to today review mode', () => {
    expect(getTaskHref(makeTask({ type: 'review', module: 'write', contentId: 'word-1', bookId: 'cet4' }))).toBe(
      '/review/today',
    );
    expect(getTaskHref(makeTask({ type: 'review', module: 'speak', contentId: 'scenario-line-1', bookId: 'coffee-shop' }))).toBe(
      '/review/today',
    );
  });

  it('uses the normal fallback order for non-review tasks', () => {
    expect(getTaskHref(makeTask({ module: 'write', bookId: 'daily-vocab' }))).toBe('/write/book/daily-vocab');
    expect(getTaskHref(makeTask({ module: 'read', contentId: 'article-2' }))).toBe('/read/article-2');
  });

  it('redirects speak content tasks to read route', () => {
    expect(getTaskHref(makeTask({ module: 'speak', contentId: 'article-3' }))).toBe('/read/article-3');
  });
});

describe('getReviewItemHref', () => {
  it('routes write/read/listen review items to concrete content pages', async () => {
    const { getReviewItemHref } = await import('@/lib/daily-plan-links');
    expect(getReviewItemHref({ module: 'write', contentId: 'word-1', bookId: 'cet4' })).toBe('/write/word-1');
    expect(getReviewItemHref({ module: 'read', contentId: 'article-1', bookId: 'book-a' })).toBe('/read/article-1');
    expect(getReviewItemHref({ module: 'listen', contentId: 'audio-1', bookId: 'book-b' })).toBe('/listen/audio-1');
  });

  it('keeps speak review items on the book route', async () => {
    const { getReviewItemHref } = await import('@/lib/daily-plan-links');
    expect(getReviewItemHref({ module: 'speak', contentId: 'scenario-line-1', bookId: 'coffee-shop' })).toBe(
      '/speak/book/coffee-shop',
    );
  });

  it('redirects speak content review items to read route', async () => {
    const { getReviewItemHref } = await import('@/lib/daily-plan-links');
    expect(getReviewItemHref({ module: 'speak', contentId: 'article-1' })).toBe('/read/article-1');
  });
});
