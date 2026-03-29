import { describe, expect, it } from 'vitest';
import { getMessage, messages } from './dictionary';

describe('i18n dictionary', () => {
  it('keeps en and zh namespace keys aligned', () => {
    const namespaceNames = Object.keys(messages) as Array<keyof typeof messages>;

    namespaceNames.forEach((namespace) => {
      expect(Object.keys(messages[namespace].zh)).toEqual(Object.keys(messages[namespace].en));
    });
  });

  it('reads nested common labels for both locales', () => {
    expect(getMessage('en', 'common', 'actions')).toMatchObject({ settings: 'Settings' });
    expect(getMessage('zh', 'common', 'actions')).toMatchObject({ settings: '设置' });
  });
});
