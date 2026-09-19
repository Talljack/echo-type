import { describe, expect, it } from 'vitest';
import { classifyMaterial } from '@/lib/material-types';
import { builtinCommunityScenarios } from './community-scenarios';

describe('built-in community scenarios', () => {
  it('provides complete practice passages for core real-world situations', () => {
    const articles = builtinCommunityScenarios.filter((item) => item.type === 'article');
    const tags = new Set(articles.flatMap((item) => item.tags));

    expect(articles.length).toBeGreaterThanOrEqual(24);
    expect([...tags]).toEqual(expect.arrayContaining([
      'self-introduction',
      'job-interview',
      'airport',
      'restaurant',
      'medical',
      'negotiation',
      'complaint',
      'immigration',
      'networking',
      'performance-review',
    ]));
    expect(new Set(articles.map((item) => item.difficulty))).toEqual(new Set(['beginner', 'intermediate', 'advanced']));
  });

  it('is classified as a scenario workspace rather than a reading workspace', () => {
    const persistedItems = builtinCommunityScenarios.map((item, index) => ({
      ...item,
      id: `scenario-${index}`,
      createdAt: 0,
      updatedAt: 0,
    }));

    expect(classifyMaterial(persistedItems)).toBe('scenario');
  });
});
