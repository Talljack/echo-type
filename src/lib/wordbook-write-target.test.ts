import { describe, expect, it } from 'vitest';
import type { ContentItem } from '@/types/content';
import { isWordBookWriteMatch, resolveWordBookWriteTarget } from './wordbook-write-target';

const baseItem: ContentItem = {
  id: 'item-1',
  title: 'turning',
  text: 'a. 转弯的，旋转的',
  type: 'word',
  category: 'pet',
  tags: ['pet'],
  source: 'builtin',
  difficulty: 'beginner',
  createdAt: 1,
  updatedAt: 1,
};

describe('resolveWordBookWriteTarget', () => {
  it('uses the English word title as the typing target for wordbook vocabulary items', () => {
    const target = resolveWordBookWriteTarget(baseItem);

    expect(target.text).toBe('turning');
    expect(target.prompt).toBe('a. 转弯的，旋转的');
  });

  it('keeps sentence-like items typing the sentence text', () => {
    const target = resolveWordBookWriteTarget({
      ...baseItem,
      title: 'Checking in',
      text: 'I would like to check in, please.',
      type: 'sentence',
    });

    expect(target.text).toBe('I would like to check in, please.');
    expect(target.prompt).toBe('Checking in');
  });
});

describe('isWordBookWriteMatch', () => {
  it('treats straight and curly apostrophes as the same typing answer', () => {
    expect(isWordBookWriteMatch("Los Angeles'", "Los Angeles’")).toBe(true);
    expect(isWordBookWriteMatch('Los Angeles’', "Los Angeles'")).toBe(true);
    expect(isWordBookWriteMatch('Los Angeles‘', "Los Angeles'")).toBe(true);
  });

  it('still rejects genuinely different text', () => {
    expect(isWordBookWriteMatch("Los Angeles'", 'Los Angeles')).toBe(false);
  });
});
