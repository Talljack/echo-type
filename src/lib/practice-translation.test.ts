import { describe, expect, it } from 'vitest';
import { alignPracticeTranslations } from './practice-translation';

describe('practice translation alignment', () => {
  it('uses source indices, including untranslated and repeated sentences', () => {
    const result = alignPracticeTranslations('Title\n\nHello. Hello. That’s it.', [
      { original: 'Hello.', translation: '你好一' },
      { original: 'Not present.', translation: '忽略' },
      { original: 'Hello.', translation: '你好二' },
      { original: "That's it.", translation: '就是这样' },
    ]);
    expect(result.map(({ startWordIndex, endWordIndex, endCharIndex }) => [startWordIndex, endWordIndex, endCharIndex]))
      .toEqual([[1, 1, 11], [2, 2, 18], [3, 4, 29]]);
  });
  it('does not attach invented text to the original', () => {
    expect(alignPracticeTranslations('Hello.', [{ original: 'Goodbye.', translation: '再见' }])).toEqual([]);
    expect(alignPracticeTranslations('Hello.', null)).toEqual([]);
  });
  it('realigns error-word review without reusing original character offsets', () => {
    expect(alignPracticeTranslations('World!', [
      { original: 'Hello.', translation: '你好' },
      { original: 'World!', translation: '世界' },
    ])).toEqual([{ startWordIndex: 0, endWordIndex: 0, endCharIndex: 5, translation: '世界' }]);
  });
});
