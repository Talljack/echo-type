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
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { darkColors, lightColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

function buildPaperTheme(isDark: boolean) {
  const c = isDark ? darkColors : lightColors;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      secondary: c.secondary,
      tertiary: c.accent,
      background: c.background,
      surface: c.surface,
      surfaceVariant: c.surfaceVariant,
      onPrimary: c.onPrimary,
      onSecondary: c.onSecondary,
      onBackground: c.onBackground,
      onSurface: c.onSurface,
      onSurfaceVariant: c.onSurfaceSecondary,
      outline: c.border,
      error: c.error,
    },
  };
}

function AppWithPaper() {
  const { isDark } = useAppTheme();
  const theme = buildPaperTheme(isDark);

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: (props) => <MaterialCommunityIcons {...props} />,
      }}
    >
      <Slot />
      <Toast config={toastConfig} />
    </PaperProvider>
  );
}

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
  const { seedIfNeeded } = useLibraryStore();

  const hasCompletedOnboarding = settings.onboardingCompleted;

  useEffect(() => {
    async function initialize() {
      try {
        await loadSettings();
        await loadUser();
        await seedIfNeeded();
        setIsReady(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsReady(true);
      }
    }

    initialize();
  }, [loadSettings, loadUser, seedIfNeeded]);

  useEffect(() => {
    if (isReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded]);

  useEffect(() => {
    if (!isReady) return;

    const inTabs = segments[0] === '(tabs)';
    const inWelcome = segments[0] === 'welcome';

    if (!hasCompletedOnboarding && !inWelcome) {
      router.replace('/welcome');
    } else if (hasCompletedOnboarding && inWelcome) {
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
          <AppWithPaper />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
