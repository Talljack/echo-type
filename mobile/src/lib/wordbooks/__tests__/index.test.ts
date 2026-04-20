import { ALL_WORDBOOKS, ALL_WORDBOOK_IDS, getWordBook } from '../index';

describe('wordbooks/index', () => {
  describe('ALL_WORDBOOKS', () => {
    it('should contain both vocabulary and scenario books', () => {
      expect(ALL_WORDBOOKS.length).toBeGreaterThan(0);

      const vocabularyBooks = ALL_WORDBOOKS.filter((b) => b.kind === 'vocabulary');
      const scenarioBooks = ALL_WORDBOOKS.filter((b) => b.kind === 'scenario');

      expect(vocabularyBooks.length).toBeGreaterThan(0);
      expect(scenarioBooks.length).toBeGreaterThan(0);
    });

    it('should have unique IDs', () => {
      const ids = ALL_WORDBOOKS.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid structure for each book', () => {
      ALL_WORDBOOKS.forEach((book) => {
        expect(book.id).toBeTruthy();
        expect(book.name).toBeTruthy();
        expect(book.nameEn).toBeTruthy();
        expect(book.description).toBeTruthy();
        expect(['vocabulary', 'scenario']).toContain(book.kind);
        expect(book.emoji).toBeTruthy();
        expect(['beginner', 'intermediate', 'advanced']).toContain(book.difficulty);
        expect(book.filterTag).toBeTruthy();
        expect(Array.isArray(book.tags)).toBe(true);
        expect(book.tags.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ALL_WORDBOOK_IDS', () => {
    it('should match the IDs from ALL_WORDBOOKS', () => {
      const expectedIds = ALL_WORDBOOKS.map((b) => b.id);
      expect(ALL_WORDBOOK_IDS).toEqual(expectedIds);
    });

    it('should contain expected vocabulary books', () => {
      const expectedBooks = [
        'elementary',
        'junior-high',
        'senior-high',
        'nce1',
        'nce2',
        'nce3',
        'nce4',
        'cet4',
        'cet6',
        'toefl',
        'ielts',
        'gre',
      ];

      expectedBooks.forEach((bookId) => {
        expect(ALL_WORDBOOK_IDS).toContain(bookId);
      });
    });

    it('should contain expected scenario books', () => {
      const expectedScenarios = ['airport', 'restaurant', 'hotel'];

      expectedScenarios.forEach((scenarioId) => {
        expect(ALL_WORDBOOK_IDS).toContain(scenarioId);
      });
    });
  });

  describe('getWordBook', () => {
    it('should return a book by ID', () => {
      const book = getWordBook('cet4');
      expect(book).toBeDefined();
      expect(book?.id).toBe('cet4');
      expect(book?.name).toBe('大学英语四级词汇');
      expect(book?.nameEn).toBe('CET-4');
    });

    it('should return undefined for non-existent ID', () => {
      const book = getWordBook('non-existent-book');
      expect(book).toBeUndefined();
    });

    it('should return scenario books', () => {
      const book = getWordBook('airport');
      expect(book).toBeDefined();
      expect(book?.kind).toBe('scenario');
      expect(book?.items).toBeDefined();
      expect(book?.items?.length).toBeGreaterThan(0);
    });

    it('should return vocabulary books with itemCount', () => {
      const book = getWordBook('toefl');
      expect(book).toBeDefined();
      expect(book?.kind).toBe('vocabulary');
      expect(book?.itemCount).toBeGreaterThan(0);
    });
  });

  describe('vocabulary books', () => {
    it('should have school books', () => {
      const schoolBooks = ALL_WORDBOOKS.filter((b) => b.tags.includes('school'));
      expect(schoolBooks.length).toBeGreaterThan(0);
    });

    it('should have textbook books', () => {
      const textbookBooks = ALL_WORDBOOKS.filter((b) => b.filterTag === 'Textbook');
      expect(textbookBooks.length).toBeGreaterThan(0);
    });

    it('should have exam books', () => {
      const examBooks = ALL_WORDBOOKS.filter((b) => b.tags.includes('exam'));
      expect(examBooks.length).toBeGreaterThan(0);
    });

    it('should have tech books', () => {
      const techBooks = ALL_WORDBOOKS.filter((b) => b.filterTag === 'Tech');
      expect(techBooks.length).toBeGreaterThan(0);
    });
  });

  describe('scenario books', () => {
    it('should have inline items', () => {
      const scenarioBooks = ALL_WORDBOOKS.filter((b) => b.kind === 'scenario');

      scenarioBooks.forEach((book) => {
        expect(book.items).toBeDefined();
        expect(book.items?.length).toBeGreaterThan(0);
      });
    });

    it('should have valid item structure', () => {
      const airportBook = getWordBook('airport');
      expect(airportBook?.items).toBeDefined();

      const firstItem = airportBook?.items?.[0];
      expect(firstItem).toBeDefined();
      expect(firstItem?.title).toBeTruthy();
      expect(firstItem?.text).toBeTruthy();
      expect(firstItem?.type).toBeTruthy();
      expect(firstItem?.category).toBe('airport');
      expect(Array.isArray(firstItem?.tags)).toBe(true);
      expect(firstItem?.source).toBe('builtin');
      expect(['beginner', 'intermediate', 'advanced']).toContain(firstItem?.difficulty);
    });
  });
});
