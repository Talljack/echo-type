import { describe, expect, it } from 'vitest';
import { getMessage, messages } from './dictionary';

function expectSameShape(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    expect(a).toHaveLength(b.length);
    a.forEach((item, index) => expectSameShape(item, b[index]));
    return;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const keys = Object.keys(aRecord).sort();

    expect(keys).toEqual(Object.keys(bRecord).sort());

    keys.forEach((key) => {
      expectSameShape(aRecord[key], bRecord[key]);
    });
  }
}

describe('i18n dictionary', () => {
  it('registers all expected namespaces and keeps en/zh shapes aligned', () => {
    expect(messages).toHaveProperty('tagManagement');
    expect(messages).toHaveProperty('ollamaWarning');
    expect(messages).toHaveProperty('assessment');

    const namespaceNames = Object.keys(messages) as Array<keyof typeof messages>;

    namespaceNames.forEach((namespace) => {
      expectSameShape(messages[namespace].en, messages[namespace].zh);
    });
  });

  it('reads nested common labels for both locales', () => {
    expect(getMessage('en', 'common', 'actions')).toMatchObject({ settings: 'Settings' });
    expect(getMessage('zh', 'common', 'actions')).toMatchObject({ settings: '设置' });
  });
});
