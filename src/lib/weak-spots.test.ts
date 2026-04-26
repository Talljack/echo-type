import { beforeEach, describe, expect, it, vi } from 'vitest';

type StoredWeakSpot = {
  id: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  weakSpotType: string;
  sourceId: string;
  sourceType: 'content' | 'session' | 'favorite';
  text: string;
  normalizedText: string;
  reason: string;
  count: number;
  lastSeenAt: number;
  targetHref: string;
  resolved: boolean;
  accuracy?: number;
};

let weakSpots: StoredWeakSpot[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    weakSpots: {
      where: (field: string) => {
        if (field === '[module+weakSpotType+normalizedText]') {
          return {
            equals: ([module, weakSpotType, normalizedText]: [string, string, string]) => ({
              first: async () =>
                weakSpots.find(
                  (item) =>
                    item.module === module &&
                    item.weakSpotType === weakSpotType &&
                    item.normalizedText === normalizedText,
                ),
            }),
          };
        }

        if (field === 'resolved') {
          return {
            equals: (resolved: boolean) => ({
              reverse: () => ({
                sortBy: async (sortField: keyof StoredWeakSpot) =>
                  weakSpots
                    .filter((item) => item.resolved === resolved)
                    .sort((a, b) => Number(b[sortField]) - Number(a[sortField])),
              }),
            }),
          };
        }

        throw new Error(`Unexpected weakSpots.where(${field})`);
      },
      toArray: async () => weakSpots,
      add: async (item: StoredWeakSpot) => {
        weakSpots.push(item);
      },
      update: async (id: string, changes: Partial<StoredWeakSpot>) => {
        weakSpots = weakSpots.map((item) => (item.id === id ? { ...item, ...changes } : item));
      },
    },
  },
}));

const { getOpenWeakSpots, normalizeWeakSpotText, resolveWeakSpot, upsertWeakSpot } = await import('@/lib/weak-spots');

describe('weak spots', () => {
  beforeEach(() => {
    weakSpots = [];
  });

  it('normalizes spacing and case', () => {
    expect(normalizeWeakSpotText('  Need   Coffee  ')).toBe('need coffee');
  });

  it('upserts repeated mistakes onto the same weak spot', async () => {
    await upsertWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: 'content-1',
      sourceType: 'content',
      text: 'Need coffee',
      reason: 'First miss',
      targetHref: '/listen/content-1?mode=dictation&sentence=0',
      accuracy: 42,
    });

    await upsertWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: 'content-1',
      sourceType: 'content',
      text: ' need   coffee ',
      reason: 'Second miss',
      targetHref: '/listen/content-1?mode=dictation&sentence=0',
      accuracy: 55,
    });

    expect(weakSpots).toHaveLength(1);
    expect(weakSpots[0]).toMatchObject({
      count: 2,
      reason: 'Second miss',
      accuracy: 55,
      resolved: false,
    });
  });

  it('resolves a matching weak spot after a successful retry', async () => {
    await upsertWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: 'content-1',
      sourceType: 'content',
      text: 'Need coffee',
      reason: 'Missed',
      targetHref: '/listen/content-1?mode=dictation&sentence=0',
      accuracy: 42,
    });

    await resolveWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      text: 'need coffee',
      accuracy: 100,
    });

    expect(weakSpots[0]).toMatchObject({
      resolved: true,
      accuracy: 100,
    });
  });

  it('returns only open weak spots', async () => {
    await upsertWeakSpot({
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: 'content-1',
      sourceType: 'content',
      text: 'Need coffee',
      reason: 'Missed',
      targetHref: '/listen/content-1?mode=dictation&sentence=0',
    });

    await upsertWeakSpot({
      module: 'read',
      weakSpotType: 'reading-phrase',
      sourceId: 'content-2',
      sourceType: 'content',
      text: 'Open the menu',
      reason: 'Missed',
      targetHref: '/read/content-2',
    });

    await resolveWeakSpot({
      module: 'read',
      weakSpotType: 'reading-phrase',
      text: 'Open the menu',
    });

    const openWeakSpots = await getOpenWeakSpots();

    expect(openWeakSpots).toHaveLength(1);
    expect(openWeakSpots[0].text).toBe('Need coffee');
  });
});
