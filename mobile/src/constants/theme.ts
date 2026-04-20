import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1',
    primaryContainer: '#E0E7FF',
    secondary: '#EC4899',
    secondaryContainer: '#FCE7F3',
    tertiary: '#8B5CF6',
    tertiaryContainer: '#EDE9FE',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',
    background: '#F9FAFB',
    error: '#EF4444',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#111827',
    onBackground: '#111827',
    outline: '#D1D5DB',
  },
  roundness: 12,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    primaryContainer: '#4338CA',
    secondary: '#F472B6',
    secondaryContainer: '#BE185D',
    tertiary: '#A78BFA',
    tertiaryContainer: '#6D28D9',
    surface: '#1F2937',
    surfaceVariant: '#374151',
    background: '#111827',
    error: '#F87171',
    onPrimary: '#1E1B4B',
    onSecondary: '#831843',
    onSurface: '#F9FAFB',
    onBackground: '#F9FAFB',
    outline: '#6B7280',
  },
  roundness: 12,
};

export const theme = lightTheme;
