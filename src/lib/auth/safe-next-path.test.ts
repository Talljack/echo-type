import { describe, expect, it } from 'vitest';
import { safeAuthNextPath } from './safe-next-path';

describe('safeAuthNextPath', () => {
  it('preserves app-relative destination query and fragment', () => {
    expect(safeAuthNextPath('/library?type=word#saved')).toBe('/library?type=word#saved');
  });
  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/%5cevil.example', '/%2f%2fevil.example', '/\n/evil.example', 'dashboard'])('rejects unsafe redirect %s', (path) => {
    expect(safeAuthNextPath(path)).toBe('/dashboard');
  });
});
