/**
 * Design Tokens - Spacing
 * 8dp spacing system for consistent rhythm
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/**
 * Component-specific spacing presets
 */
export const componentSpacing = {
  // Screen padding
  screenPadding: spacing.md, // 16

  // Card padding
  cardPadding: spacing.md, // 16
  cardPaddingLarge: spacing.lg, // 24

  // Section gaps
  sectionGap: spacing.lg, // 24
  sectionGapLarge: spacing.xl, // 32

  // List item gaps
  listItemGap: spacing.sm, // 8
  listItemGapLarge: spacing.md, // 16

  // Button padding
  buttonPaddingVertical: spacing.sm, // 8
  buttonPaddingHorizontal: spacing.md, // 16

  // Input padding
  inputPadding: spacing.md, // 16

  // Modal padding
  modalPadding: spacing.lg, // 24

  // Touch target minimum
  touchTargetMin: 44,
} as const;
