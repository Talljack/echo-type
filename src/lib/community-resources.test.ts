import { describe, expect, it } from 'vitest';
import { COMMUNITY_RESOURCES } from './community-resources';

describe('community resources', () => {
  it('covers the core everyday scenarios with linked resources', () => {
    const scenarios = new Set(COMMUNITY_RESOURCES.flatMap((resource) => resource.scenarios));

    expect([...scenarios]).toEqual(expect.arrayContaining([
      'self-introduction',
      'job-interview',
      'travel',
      'airport',
      'hotel',
      'restaurant',
    ]));
  });

  it('includes official YouTube and TED resources without bundling third-party material', () => {
    const ids = new Set(COMMUNITY_RESOURCES.map((resource) => resource.id));
    const tedResources = COMMUNITY_RESOURCES.filter((resource) => resource.publisher.startsWith('TED'));

    expect([...ids]).toEqual(expect.arrayContaining([
      'bbc-learning-english-youtube',
      'ted-ed-public-speaking-101',
      'ted-public-speaking-playlist',
      'ted-echo-method',
    ]));
    expect(tedResources.every((resource) => resource.access === 'external-link')).toBe(true);
    expect(tedResources.every((resource) => resource.url.startsWith('https://'))).toBe(true);
  });

  it('keeps every external resource on a secure URL', () => {
    expect(COMMUNITY_RESOURCES.every((resource) => resource.url.startsWith('https://'))).toBe(true);
  });
});
