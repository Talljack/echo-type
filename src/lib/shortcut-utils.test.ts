import { describe, expect, it } from 'vitest';

import { getNormalizedShortcutKey } from './shortcut-utils';

describe('shortcut-utils', () => {
  it('normalizes option-modified letter keys using event.code', () => {
    expect(
      getNormalizedShortcutKey({
        code: 'KeyS',
        key: 'ß',
      } as Pick<KeyboardEvent, 'code' | 'key'>),
    ).toBe('s');
  });

  it('normalizes number row keys using event.code', () => {
    expect(
      getNormalizedShortcutKey({
        code: 'Digit1',
        key: '1',
      } as Pick<KeyboardEvent, 'code' | 'key'>),
    ).toBe('1');
  });

  it('falls back to mapped special keys', () => {
    expect(
      getNormalizedShortcutKey({
        code: 'ArrowLeft',
        key: 'ArrowLeft',
      } as Pick<KeyboardEvent, 'code' | 'key'>),
    ).toBe('arrowleft');
  });
});
