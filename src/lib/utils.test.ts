import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMac, normalizeTags } from './utils';

describe('utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects mac platforms at runtime', () => {
    vi.stubGlobal('navigator', {
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      userAgentData: { platform: 'macOS' },
    });

    expect(isMac()).toBe(true);
  });

  it('does not mark non-apple platforms as mac', () => {
    vi.stubGlobal('navigator', {
      platform: 'Win32',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      userAgentData: { platform: 'Windows' },
    });

    expect(isMac()).toBe(false);
  });

  it('normalizes and deduplicates tags', () => {
    expect(normalizeTags('Business, daily, business , Travel')).toEqual([
      'business',
      'daily',
      'travel',
    ]);
  });
});
