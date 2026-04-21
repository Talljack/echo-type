import { calculateStats, compareWords } from '../read-feedback';

describe('read-feedback', () => {
  it('aligns missing and extra spoken words instead of scoring by index only', () => {
    const results = compareWords(['a', 'shirt', 'with', 'black', 'and', 'white', 'stripes'], ['a', 'shirt', 'black', 'and', 'white', 'stripes', 'today']);

    expect(results).toEqual([
      expect.objectContaining({ word: 'a', accuracy: 'correct' }),
      expect.objectContaining({ word: 'shirt', accuracy: 'correct' }),
      expect.objectContaining({ word: 'with', accuracy: 'missing' }),
      expect.objectContaining({ word: 'black', accuracy: 'correct' }),
      expect.objectContaining({ word: 'and', accuracy: 'correct' }),
      expect.objectContaining({ word: 'white', accuracy: 'correct' }),
      expect.objectContaining({ word: 'stripes', accuracy: 'correct' }),
      expect.objectContaining({ word: 'today', accuracy: 'extra' }),
    ]);
  });

  it('calculates web-style aggregate stats from aligned results', () => {
    const stats = calculateStats([
      { word: 'analyze', accuracy: 'correct', similarity: 1 },
      { word: 'stripe', accuracy: 'close', similarity: 0.7 },
      { word: 'word', accuracy: 'wrong', similarity: 0.2 },
      { word: 'missed', accuracy: 'missing', similarity: 0 },
      { word: 'extra', accuracy: 'extra', similarity: 0, recognized: 'extra' },
    ]);

    expect(stats).toEqual({
      total: 4,
      correct: 1,
      close: 1,
      wrong: 1,
      missing: 1,
      extra: 1,
      accuracy: 38,
    });
  });
});
