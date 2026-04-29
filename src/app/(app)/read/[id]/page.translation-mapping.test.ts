import { describe, expect, it } from 'vitest';

function mapSentenceTranslations(
  sentenceTranslations: Array<{ original: string; translation: string }> | null,
) {
  if (!sentenceTranslations?.length) return null;

  let startWordIndex = 0;

  return sentenceTranslations.map((sentence) => {
    const wordCount = sentence.original.split(/\s+/).filter(Boolean).length;
    const entry = {
      startWordIndex,
      endWordIndex: startWordIndex + Math.max(wordCount - 1, 0),
      translation: sentence.translation,
    };
    startWordIndex += wordCount;
    return entry;
  });
}

describe('Read detail translation mapping', () => {
  it('maps sentence translations into read-aloud word ranges', () => {
    expect(
      mapSentenceTranslations([
        { original: 'Hello world.', translation: '你好，世界。' },
        { original: 'This is a test.', translation: '这是一个测试。' },
      ]),
    ).toEqual([
      { startWordIndex: 0, endWordIndex: 1, translation: '你好，世界。' },
      { startWordIndex: 2, endWordIndex: 5, translation: '这是一个测试。' },
    ]);
  });

  it('returns null when there are no sentence translations', () => {
    expect(mapSentenceTranslations(null)).toBeNull();
  });
});
