import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  OpenSans_300Light,
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
import { darkColors, lightColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.secondary,
    tertiary: lightColors.accent,
    background: lightColors.background,
    surface: lightColors.surface,
    surfaceVariant: lightColors.surfaceVariant,
    onPrimary: lightColors.onPrimary,
    onSecondary: lightColors.onSecondary,
    onBackground: lightColors.onBackground,
    onSurface: lightColors.onSurface,
    onSurfaceVariant: lightColors.onSurfaceSecondary,
    outline: lightColors.border,
    error: lightColors.error,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.secondary,
    tertiary: darkColors.accent,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceVariant,
    onPrimary: darkColors.onPrimary,
    onSecondary: darkColors.onSecondary,
    onBackground: darkColors.onBackground,
    onSurface: darkColors.onSurface,
    onSurfaceVariant: darkColors.onSurfaceSecondary,
    outline: darkColors.border,
    error: darkColors.error,
  },
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    OpenSans_300Light,
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
  });

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
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded]);

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

  if (!isReady || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: lightColors.background }} />;
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
