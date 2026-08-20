import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

describe('read practice layout', () => {
  it('keeps long reference text in an independently scrollable viewport', () => {
    expect(source).toContain('data-testid="read-reference-scroll"');
    expect(source).toMatch(/read-reference-scroll[\s\S]*min-h-0 flex-1/);
    expect(source).toMatch(/read-reference-scroll[\s\S]*overflow-y-auto/);
  });

  it('keeps read controls attached below the reference viewport', () => {
    expect(source).toContain('data-testid="read-practice-workspace"');
    expect(source).toMatch(/read-practice-workspace[\s\S]*h-\[calc\(100dvh-9\.5rem\)\]/);
    expect(source).toMatch(/read-practice-workspace[\s\S]*ReadAloudInlineControls/);
  });

  it('shows recognition errors in the native controls', () => {
    const controlsStart = source.indexOf('{isIOSNativeHost ? (', source.indexOf('{raIsActive &&'));
    const controlsEnd = source.indexOf(') : (\n              <ReadAloudInlineControls', controlsStart);

    expect(source.slice(controlsStart, controlsEnd)).toContain(
      '{speechError && <p className="text-xs text-red-500 text-center max-w-md">{speechError}</p>}',
    );
  });
});
