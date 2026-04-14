import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { toastConfig } from '@/components/error/ToastConfig';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

// Custom theme based on design system
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5',
    secondary: '#818CF8',
    tertiary: '#16A34A',
    background: '#EEF2FF',
    surface: '#FFFFFF',
    surfaceVariant: '#EBEEF8',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#312E81',
    onSurface: '#312E81',
    onSurfaceVariant: '#6366F1',
    outline: '#C7D2FE',
    error: '#DC2626',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    secondary: '#A78BFA',
    tertiary: '#22C55E',
    background: '#1E1B4B',
    surface: '#312E81',
    surfaceVariant: '#4C1D95',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#EEF2FF',
    onSurface: '#E0E7FF',
    onSurfaceVariant: '#C7D2FE',
    outline: '#6366F1',
    error: '#EF4444',
  },
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  const { loadUser } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();

  const theme = settings.theme === 'dark' ? darkTheme : lightTheme;
  const hasCompletedOnboarding = settings.onboardingCompleted;

  useEffect(() => {
    async function initialize() {
      try {
        // Load settings first
        await loadSettings();

        // Load user session (optional, won't block if not logged in)
        await loadUser();

        setIsReady(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsReady(true);
      }
    }

    initialize();
  }, [loadSettings, loadUser]);

  useEffect(() => {
    if (!isReady) return;

    const inTabs = segments[0] === '(tabs)';
    const inWelcome = segments[0] === 'welcome';

    console.log('Navigation check:', { hasCompletedOnboarding, inTabs, inWelcome, segments });

    // Only redirect if we're in the wrong place
    if (!hasCompletedOnboarding && !inWelcome) {
      console.log('Redirecting to welcome (not completed onboarding)');
      router.replace('/welcome');
    } else if (hasCompletedOnboarding && inWelcome) {
      console.log('Redirecting to tabs (completed onboarding, still in welcome)');
      router.replace('/(tabs)');
    }
  }, [isReady, hasCompletedOnboarding, segments, router]);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#EEF2FF' }}>{/* Loading state */}</View>;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <PaperProvider
            theme={theme}
            settings={{
              icon: (props) => <MaterialCommunityIcons {...props} />,
            }}
          >
            <Slot />
            <Toast config={toastConfig} />
          </PaperProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
