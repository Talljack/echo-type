import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./selection-translation-provider.tsx', import.meta.url), 'utf8');

describe('selection translation triggers', () => {
  it('handles pointer and native selection completion instead of mouseup only', () => {
    expect(source).toContain("document.addEventListener('pointerup'");
    expect(source).toContain("document.addEventListener('selectionchange'");
    expect(source).not.toContain("document.addEventListener('mouseup'");
    expect(source).toContain('lastHandledSelectionRef');
    expect(source).toMatch(/handlePointerUp[\s\S]*clearTimeout\(selectionTimer\)/);
  });
});
