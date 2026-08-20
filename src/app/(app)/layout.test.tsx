import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

describe('AppLayout bootstrap', () => {
  it('publishes readiness after child pages can subscribe', () => {
    expect(source).toContain(
      "window.requestAnimationFrame(() => window.dispatchEvent(new Event('echotype:bootstrap-ready')))",
    );
  });

  it('mounts route content only after local data is seeded', () => {
    expect(source).toContain('{seeded ? children : null}');
  });
});
