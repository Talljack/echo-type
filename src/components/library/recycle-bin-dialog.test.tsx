import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./recycle-bin-dialog.tsx', import.meta.url), 'utf8');

describe('RecycleBinDialog', () => {
  it('requires confirmation before permanently deleting content', () => {
    expect(source).toContain('window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)');
  });
});
