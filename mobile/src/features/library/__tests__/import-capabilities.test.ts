import { getImportOptions, isImportMethodEnabled } from '../import-capabilities';

describe('import capabilities', () => {
  it('only enables text import in the MVP', () => {
    expect(isImportMethodEnabled('text')).toBe(true);
    expect(isImportMethodEnabled('url')).toBe(false);
    expect(isImportMethodEnabled('youtube')).toBe(false);
    expect(isImportMethodEnabled('pdf')).toBe(false);
    expect(isImportMethodEnabled('ai')).toBe(false);
  });

  it('marks non-text import methods as coming soon', () => {
    expect(getImportOptions().filter((item) => item.enabled)).toEqual([
      expect.objectContaining({ method: 'text', enabled: true }),
    ]);
    expect(getImportOptions().filter((item) => !item.enabled)).toHaveLength(4);
  });
});
