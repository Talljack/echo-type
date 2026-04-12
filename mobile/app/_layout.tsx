import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { database } from '@/database';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const ONBOARDING_KEY = 'echotype_onboarding_completed';

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
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const { loadUser } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();

  const theme = settings.theme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize database
        await database.write(async () => {
          // Database is ready
        });

        // Load settings
        await loadSettings();

        // Load user session (optional, won't block if not logged in)
        await loadUser();

        // Check onboarding status
        const onboardingStatus = await SecureStore.getItemAsync(ONBOARDING_KEY);
        setHasCompletedOnboarding(onboardingStatus === 'true');

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

    const _inTabs = segments[0] === '(tabs)';
    const inWelcome = segments[0] === 'welcome';

    // Redirect logic
    if (!hasCompletedOnboarding && !inWelcome) {
      router.replace('/welcome');
    } else if (hasCompletedOnboarding && inWelcome) {
      router.replace('/(tabs)');
    }
  }, [isReady, hasCompletedOnboarding, segments, router.replace]);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#EEF2FF' }}>{/* Loading state */}</View>;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
        <Slot />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
