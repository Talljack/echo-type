/**
 * Design Tokens - Border Radius
 * Claymorphism style uses generous rounded corners
 */

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  xxxl: 32,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Component-specific radius presets
 */
export const componentRadius = {
  button: 8, // radius.md
  buttonLarge: 12, // radius.lg
  card: 12, // radius.lg
  modal: 16, // radius.xl
  input: 4, // radius.sm
  chip: 9999, // radius.full
  avatar: 9999, // radius.full
} as const;
