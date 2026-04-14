/**
 * Design System - Theme Tokens
 * Centralized export for all design tokens
 */

export { type ColorToken, colors } from './colors';
export { componentRadius, type RadiusToken, radius } from './radius';
export { type ShadowToken, shadows } from './shadows';
export { componentSpacing, type SpacingToken, spacing } from './spacing';
export { type TypographyToken, typography } from './typography';

/**
 * Complete theme object
 */
export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  componentSpacing: require('./spacing').componentSpacing,
  typography: require('./typography').typography,
  radius: require('./radius').radius,
  componentRadius: require('./radius').componentRadius,
  shadows: require('./shadows').shadows,
} as const;
