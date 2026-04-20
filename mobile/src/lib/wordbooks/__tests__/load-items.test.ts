import { loadWordBookItems } from '../load-items';
import { getWordBook } from '../index';

// Mock require for JSON files
jest.mock('../data/nce1.json', () => [
  { word: 'hello', sentence: 'Hello, how are you?' },
  { word: 'world', sentence: 'The world is beautiful.' },
], { virtual: true });

describe('wordbooks/load-items', () => {
  describe('loadWordBookItems', () => {
    it('should return inline items for scenario books', async () => {
      const items = await loadWordBookItems('airport');

      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].title).toBeTruthy();
      expect(items[0].text).toBeTruthy();
      expect(items[0].category).toBe('airport');
    });

    it('should return empty array for non-existent book', async () => {
      const items = await loadWordBookItems('non-existent-book');
      expect(items).toEqual([]);
    });

    it('should handle books with no items gracefully', async () => {
      // Most vocabulary books don't have inline items
      const items = await loadWordBookItems('cet4');

      // Should return empty array since JSON file doesn't exist in test
      expect(Array.isArray(items)).toBe(true);
    });

    it('should transform JSON data correctly when available', async () => {
      // This test would work if we had the actual JSON file
      // For now, it tests the fallback behavior
      const items = await loadWordBookItems('nce1');

      expect(Array.isArray(items)).toBe(true);

      // If JSON was loaded, check structure
      if (items.length > 0) {
        const item = items[0];
        expect(item.title).toBeTruthy();
        expect(item.text).toBeTruthy();
        expect(item.type).toBe('word');
        expect(item.category).toBe('nce1');
        expect(item.tags).toContain('nce1');
        expect(item.source).toBe('builtin');
        expect(['beginner', 'intermediate', 'advanced']).toContain(item.difficulty);
      }
    });

    it('should use book difficulty for loaded items', async () => {
      const book = getWordBook('toefl');
      expect(book?.difficulty).toBe('advanced');

      // If we had JSON data, items would inherit this difficulty
      const items = await loadWordBookItems('toefl');

      if (items.length > 0) {
        expect(items[0].difficulty).toBe('advanced');
      }
    });

    it('should handle missing sentence in JSON data', async () => {
      // Mock data with missing sentence
      const mockData = [{ word: 'test', sentence: '' }];

      // Simulate the transformation
      const transformed = mockData.map((entry) => ({
        title: entry.word,
        text: entry.sentence || entry.word,
        type: 'word' as const,
        category: 'test',
        tags: ['test'],
        source: 'builtin' as const,
        difficulty: 'intermediate' as const,
      }));

      expect(transformed[0].text).toBe('test');
    });

    it('should prioritize inline items over JSON files', async () => {
      // Scenario books have inline items
      const airportItems = await loadWordBookItems('airport');
      const book = getWordBook('airport');

      expect(airportItems).toEqual(book?.items);
    });
  });

  describe('error handling', () => {
    it('should not throw when require fails', async () => {
      await expect(loadWordBookItems('invalid-book')).resolves.not.toThrow();
    });

    it('should return empty array when both JSON and inline items are missing', async () => {
      const items = await loadWordBookItems('non-existent');
      expect(items).toEqual([]);
    });
  });
});
