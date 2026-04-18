jest.mock('react-native', () => ({
  PixelRatio: { getFontScale: jest.fn(() => 1.3) },
}));

import { scaleFont } from './typography';

describe('scaleFont', () => {
  it('scales base size by system font scale', () => {
    expect(scaleFont(16)).toBeCloseTo(20.8); // 16 * 1.3
  });

  it('caps at default maxScale of 1.4 when system exceeds it', () => {
    const { PixelRatio } = jest.requireMock('react-native') as { PixelRatio: { getFontScale: jest.Mock } };
    PixelRatio.getFontScale.mockReturnValueOnce(2);
    expect(scaleFont(16)).toBeCloseTo(22.4); // 16 * 1.4
  });

  it('respects custom maxScale', () => {
    const { PixelRatio } = jest.requireMock('react-native') as { PixelRatio: { getFontScale: jest.Mock } };
    PixelRatio.getFontScale.mockReturnValueOnce(2);
    expect(scaleFont(16, 1.2)).toBeCloseTo(19.2); // 16 * 1.2
  });
});
