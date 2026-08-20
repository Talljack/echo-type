import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./ios-native-qa.ts', import.meta.url), 'utf8');

describe('iOS native QA hydration', () => {
  it('clears IndexedDB tables without concurrent WebKit transactions', () => {
    const clearStart = source.indexOf('async function clearDynamicTables()');
    const clearEnd = source.indexOf('\n}\n\nfunction clearDynamicStorage', clearStart);

    expect(source.slice(clearStart, clearEnd)).not.toContain('Promise.all');
  });
});
