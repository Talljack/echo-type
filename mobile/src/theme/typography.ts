/**
 * Design Tokens - Typography
 * Based on Material Design 3 type scale
 * Optimized for readability and hierarchy
 */

import { PixelRatio, TextStyle } from 'react-native';

export function scaleFont(baseSize: number, maxScale = 1.4): number {
  const scale = Math.min(PixelRatio.getFontScale(), maxScale);
  return Math.round(baseSize * scale * 100) / 100;
}

export const fontFamily = {
  heading: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  body: 'OpenSans_400Regular',
  bodyMedium: 'OpenSans_500Medium',
  bodySemiBold: 'OpenSans_600SemiBold',
  bodyBold: 'OpenSans_700Bold',
  bodyLight: 'OpenSans_300Light',
} as const;

export const typography = {
  // Display - Largest text, used sparingly
  displayLarge: {
    fontFamily: fontFamily.headingBold,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0,
  } as TextStyle,

  displayMedium: {
    fontFamily: fontFamily.headingBold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0,
  } as TextStyle,

  // Headline - High-emphasis text
  headlineLarge: {
    fontFamily: fontFamily.heading,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: 0,
  } as TextStyle,

  headlineMedium: {
    fontFamily: fontFamily.heading,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0,
  } as TextStyle,

  headlineSmall: {
    fontFamily: fontFamily.heading,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,

  // Title - Medium-emphasis text
  titleLarge: {
    fontFamily: fontFamily.heading,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,

  titleMedium: {
    fontFamily: fontFamily.heading,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  // Body - Main content text
  bodyLarge: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
  } as TextStyle,

  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  } as TextStyle,

  // Label - UI elements (buttons, tabs)
  labelLarge: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  labelMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  } as TextStyle,

  labelSmall: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
