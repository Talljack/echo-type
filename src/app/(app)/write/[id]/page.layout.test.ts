import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('write practice layout', () => {
  it('keeps reference and typing text in independently scrollable viewports', () => {
    expect(source).toMatch(/data-testid="write-reference-scroll"[\s\S]*overflow-y-auto/);
    expect(source).toMatch(/data-testid="write-typing-scroll"[\s\S]*overflow-y-auto/);
  });
});
