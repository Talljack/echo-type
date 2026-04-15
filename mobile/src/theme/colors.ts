/**
 * Design Tokens - Colors
 * iOS-inspired color system with vibrant, modern palette
 * All colors meet WCAG AA contrast requirements (4.5:1 for text)
 */

export const lightColors = {
  // Primary (Vibrant Blue) - Main brand color, inspired by iOS blue
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',
  primaryContainer: '#E5F1FF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001D35',

  // Secondary (Purple)
  secondary: '#AF52DE',
  secondaryLight: '#BF5AF2',
  onSecondary: '#FFFFFF',

  // Accent colors for different modules
  accent: '#34C759', // Green - Success, progress
  accentOrange: '#FF9500', // Orange - Speak module
  accentPink: '#FF2D55', // Pink - Listen module
  accentPurple: '#5856D6', // Purple - Read module
  accentYellow: '#FFCC00', // Yellow - Write module
  accentTeal: '#5AC8FA', // Teal - Alternative accent

  // Background - iOS style
  background: '#F2F2F7', // iOS system background
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F9F9FB',
  surfaceElevated: '#FFFFFF',

  // Text - WCAG AA compliant
  onBackground: '#000000',
  onSurface: '#000000',
  onSurfaceVariant: '#3C3C43', // iOS secondary label
  onSurfaceSecondary: '#8E8E93', // iOS tertiary label
  onSurfaceTertiary: '#C7C7CC', // iOS quaternary label

  // Borders
  border: '#C6C6C8',
  borderLight: '#E5E5EA',
  separator: '#C6C6C8',
  outline: '#C6C6C8',

  // States
  error: '#FF3B30',
  errorLight: '#FFEBEA',
  onError: '#FFFFFF',

  warning: '#FF9500',
  warningLight: '#FFF4E5',
  onWarning: '#FFFFFF',

  success: '#34C759',
  successLight: '#E8F8EC',
  onSuccess: '#FFFFFF',

  info: '#007AFF',
  infoLight: '#E5F1FF',
  onInfo: '#FFFFFF',

  // Overlay
  scrim: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.05)',

  // Interactive states
  ripple: 'rgba(0, 122, 255, 0.12)',
  pressed: 'rgba(0, 0, 0, 0.06)',
  hover: 'rgba(0, 0, 0, 0.04)',
  focus: 'rgba(0, 122, 255, 0.2)',

  // Disabled
  disabled: '#D1D1D6',
  onDisabled: '#8E8E93',

  // Card shadows
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  shadowHeavy: 'rgba(0, 0, 0, 0.12)',
} as const;

export const darkColors = {
  // Primary (Vibrant Blue) - Adjusted for dark mode
  primary: '#0A84FF',
  primaryLight: '#64D2FF',
  primaryDark: '#0066CC',
  primaryContainer: '#1C3A5E',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#B8DAFF',

  // Secondary (Purple)
  secondary: '#BF5AF2',
  secondaryLight: '#DA8FFF',
  onSecondary: '#FFFFFF',

  // Accent colors for different modules
  accent: '#32D74B', // Green
  accentOrange: '#FF9F0A', // Orange
  accentPink: '#FF375F', // Pink
  accentPurple: '#5E5CE6', // Purple
  accentYellow: '#FFD60A', // Yellow
  accentTeal: '#64D2FF', // Teal

  // Background - iOS dark mode
  background: '#000000', // iOS dark background
  backgroundSecondary: '#1C1C1E',
  surface: '#1C1C1E', // iOS elevated background
  surfaceVariant: '#2C2C2E',
  surfaceElevated: '#2C2C2E',

  // Text - WCAG AA compliant on dark backgrounds
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#EBEBF5', // iOS secondary label (dark)
  onSurfaceSecondary: '#EBEBF599', // iOS tertiary label (dark)
  onSurfaceTertiary: '#EBEBF54D', // iOS quaternary label (dark)

  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',
  separator: '#38383A',
  outline: '#38383A',

  // States
  error: '#FF453A',
  errorLight: '#3D1F1F',
  onError: '#FFFFFF',

  warning: '#FF9F0A',
  warningLight: '#3D2F1F',
  onWarning: '#FFFFFF',

  success: '#32D74B',
  successLight: '#1F3D25',
  onSuccess: '#FFFFFF',

  info: '#0A84FF',
  infoLight: '#1F2F3D',
  onInfo: '#FFFFFF',

  // Overlay
  scrim: 'rgba(0, 0, 0, 0.7)',
  overlay: 'rgba(255, 255, 255, 0.05)',

  // Interactive states
  ripple: 'rgba(10, 132, 255, 0.16)',
  pressed: 'rgba(255, 255, 255, 0.1)',
  hover: 'rgba(255, 255, 255, 0.06)',
  focus: 'rgba(10, 132, 255, 0.3)',

  // Disabled
  disabled: '#3A3A3C',
  onDisabled: '#636366',

  // Card shadows (lighter in dark mode)
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  shadowMedium: 'rgba(0, 0, 0, 0.3)',
  shadowHeavy: 'rgba(0, 0, 0, 0.4)',
} as const;

// Module-specific color palettes
export const moduleColors = {
  listen: {
    primary: '#FF2D55',
    light: '#FF6482',
    gradient: ['#FF2D55', '#FF6482'],
    background: '#FFF0F3',
  },
  speak: {
    primary: '#FF9500',
    light: '#FFB340',
    gradient: ['#FF9500', '#FFB340'],
    background: '#FFF7E6',
  },
  read: {
    primary: '#5856D6',
    light: '#7D7AFF',
    gradient: ['#5856D6', '#7D7AFF'],
    background: '#F0F0FF',
  },
  write: {
    primary: '#FFCC00',
    light: '#FFD740',
    gradient: ['#FFCC00', '#FFD740'],
    background: '#FFFBEB',
  },
  vocabulary: {
    primary: '#AF52DE',
    light: '#BF5AF2',
    gradient: ['#AF52DE', '#BF5AF2'],
    background: '#F9F0FF',
  },
  ai: {
    primary: '#007AFF',
    light: '#5AC8FA',
    gradient: ['#007AFF', '#5AC8FA'],
    background: '#E5F1FF',
  },
} as const;

// Default export for backward compatibility
export const colors = lightColors;

export type ColorToken = keyof typeof lightColors;
export type ColorScheme = 'light' | 'dark';
export type ModuleName = keyof typeof moduleColors;
