jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

import { normalizeTranslationResponse } from '../translation-api';

describe('translation-api', () => {
  it('maps sentence translation arrays into original/translation pairs', () => {
    const result = normalizeTranslationResponse(
      {
        translations: ['一件黑白条纹衬衫', '黑白条纹衬衫'],
      },
      ['a shirt with black and white stripes', 'black and white striped shirt'],
    );

    expect(result).toEqual([
      {
        original: 'a shirt with black and white stripes',
        translation: '一件黑白条纹衬衫',
      },
      {
        original: 'black and white striped shirt',
        translation: '黑白条纹衬衫',
      },
    ]);
  });

  it('falls back to a single translation payload for the full text', () => {
    const result = normalizeTranslationResponse(
      {
        translation: '分析',
      },
      ['analyze'],
    );

    expect(result).toEqual([
      {
        original: 'analyze',
        translation: '分析',
      },
    ]);
  });
});
