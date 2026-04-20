/**
 * Theme Context - Manages light/dark mode switching
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { type ColorScheme, darkColors, lightColors, type ModuleName, moduleColors } from '@/theme/colors';

interface ThemeContextValue {
  colors: typeof lightColors | typeof darkColors;
  isDark: boolean;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  getModuleColors: (module: ModuleName) => (typeof moduleColors)[ModuleName];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings, updateSettings } = useSettingsStore();

  // Determine active theme: 'light' | 'dark' | 'system'
  const themeMode = settings.theme || 'system';

  // Resolve actual color scheme
  const colorScheme: ColorScheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode as ColorScheme;
  }, [themeMode, systemColorScheme]);

  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
  };

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme });
  };

  const getModuleColors = (module: ModuleName) => {
    return moduleColors[module];
  };

  const value = useMemo(
    () => ({
      colors,
      isDark,
      colorScheme,
      toggleTheme,
      setTheme,
      getModuleColors,
    }),
    [colors, isDark, colorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}
