/**
 * Design Tokens - Typography
 * Based on Material Design 3 type scale
 * Optimized for readability and hierarchy
 */

import { TextStyle } from 'react-native';

export const typography = {
  // Display - Largest text, used sparingly
  displayLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0,
  } as TextStyle,

  displayMedium: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0,
  } as TextStyle,

  // Headline - High-emphasis text
  headlineLarge: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: 0,
  } as TextStyle,

  headlineMedium: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0,
  } as TextStyle,

  headlineSmall: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,

  // Title - Medium-emphasis text
  titleLarge: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0,
  } as TextStyle,

  titleMedium: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  // Body - Main content text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.5,
  } as TextStyle,

  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.25,
  } as TextStyle,

  bodySmall: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: 0.4,
  } as TextStyle,

  // Label - UI elements (buttons, tabs)
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.1,
  } as TextStyle,

  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  } as TextStyle,

  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
