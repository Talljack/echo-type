import { describe, expect, it } from 'vitest';
import { buildImportPracticeActions } from '@/lib/import-practice-actions';
import type { ContentItem } from '@/types/content';

const baseItem: ContentItem = {
  id: 'content-1',
  title: 'Coffee Shop Dialogue',
  text: 'Can I get a latte, please?',
  type: 'phrase',
  tags: [],
  source: 'imported',
  createdAt: 1,
  updatedAt: 1,
};

describe('buildImportPracticeActions', () => {
  it('prefers listen first for media imports', () => {
    const actions = buildImportPracticeActions(baseItem, 'media');

    expect(actions[0]).toMatchObject({
      module: 'listen',
      href: '/listen/content-1',
      priority: 'primary',
    });
  });

  it('prefers read first for document imports', () => {
    const actions = buildImportPracticeActions(baseItem, 'document');

    expect(actions[0]).toMatchObject({
      module: 'read',
      href: '/read/content-1',
      priority: 'primary',
    });
    expect(actions.some((action) => action.module === 'review')).toBe(true);
  });
});
