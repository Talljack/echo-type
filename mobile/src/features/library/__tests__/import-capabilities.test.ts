import { getImportOptions, isImportMethodEnabled } from '../import-capabilities';

describe('import capabilities', () => {
  it('enables all import methods', () => {
    expect(isImportMethodEnabled('text')).toBe(true);
    expect(isImportMethodEnabled('url')).toBe(true);
    expect(isImportMethodEnabled('youtube')).toBe(true);
    expect(isImportMethodEnabled('pdf')).toBe(true);
    expect(isImportMethodEnabled('ai')).toBe(true);
  });

  it('returns all import methods as enabled', () => {
    const options = getImportOptions();
    expect(options).toHaveLength(5);
    expect(options.filter((item) => item.enabled)).toHaveLength(5);
    expect(options.filter((item) => !item.enabled)).toHaveLength(0);
  });
});
