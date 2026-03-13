import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const bulkAddMock = vi.fn();
const countMock = vi.fn();
const sourceToArrayMock = vi.fn();
const categoryCountMock = vi.fn();
const loadWordBookItemsMock = vi.fn();

vi.stubGlobal('window', globalThis);
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
});

vi.mock('@/lib/db', () => ({
  db: {
    contents: {
      count: countMock,
      bulkAdd: bulkAddMock,
      where: (field: string) => ({
        equals: (value: string) => {
          if (field === 'source') {
            return { toArray: sourceToArrayMock };
          }
          if (field === 'category') {
            return { count: () => categoryCountMock(value) };
          }
          throw new Error(`Unexpected where().equals() field: ${field}`);
        },
      }),
    },
  },
}));

vi.mock('@/lib/seed-data/articles', () => ({ builtinArticles: [] }));
vi.mock('@/lib/seed-data/phrases', () => ({ builtinPhrases: [] }));
vi.mock('@/lib/seed-data/sentences', () => ({ builtinSentences: [] }));
vi.mock('@/lib/seed-data/words', () => ({ builtinWords: [] }));
vi.mock('@/lib/wordbooks', () => ({
  loadWordBookItems: loadWordBookItemsMock,
}));

const { seedDatabase } = await import('@/lib/seed');

describe('seedDatabase starter packs', () => {
  beforeEach(() => {
    storage.clear();
    bulkAddMock.mockReset();
    countMock.mockReset();
    sourceToArrayMock.mockReset();
    categoryCountMock.mockReset();
    loadWordBookItemsMock.mockReset();

    countMock.mockResolvedValue(0);
    sourceToArrayMock.mockResolvedValue([]);
    categoryCountMock.mockResolvedValue(0);
    loadWordBookItemsMock.mockImplementation(async (bookId: string) => [
      {
        title: `${bookId}-item`,
        text: `${bookId} sample`,
        type: bookId.includes('office') || bookId.includes('coffee') || bookId.includes('restaurant') ? 'phrase' : 'word',
        category: bookId,
        tags: [bookId],
        source: 'builtin',
        difficulty: bookId === 'cet4' ? 'intermediate' : 'beginner',
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports the default starter books and scenarios on first run', async () => {
    await seedDatabase();

    expect(loadWordBookItemsMock).toHaveBeenCalledWith('daily-vocab');
    expect(loadWordBookItemsMock).toHaveBeenCalledWith('cet4');
    expect(loadWordBookItemsMock).toHaveBeenCalledWith('coffee-shop');
    expect(loadWordBookItemsMock).toHaveBeenCalledWith('restaurant');
    expect(loadWordBookItemsMock).toHaveBeenCalledWith('office-meeting');
    expect(storage.get('echotype_starter_packs_v1')).toBe('true');

    const seededCategories = bulkAddMock.mock.calls.flatMap(([items]) =>
      (items as Array<{ category?: string }>).map((item) => item.category),
    );

    expect(seededCategories).toEqual(
      expect.arrayContaining(['daily-vocab', 'cet4', 'coffee-shop', 'restaurant', 'office-meeting']),
    );
  });

  it('skips starter categories that already have content', async () => {
    categoryCountMock.mockImplementation(async (bookId: string) => (bookId === 'daily-vocab' ? 5 : 0));

    await seedDatabase();

    expect(loadWordBookItemsMock).not.toHaveBeenCalledWith('daily-vocab');
    expect(loadWordBookItemsMock).toHaveBeenCalledWith('cet4');
  });
});
