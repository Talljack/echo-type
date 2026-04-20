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
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { toastConfig } from '@/components/error/ToastConfig';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { parseTimeString, scheduleDailyReminder } from '@/lib/notifications';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { darkColors, lightColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Cap Dynamic Type scaling app-wide so XXL system font does not break layouts.
// Individual <Text> nodes can override by passing their own maxFontSizeMultiplier.
interface TextWithDefaults {
  defaultProps?: { maxFontSizeMultiplier?: number } & Record<string, unknown>;
}
const RNTextWithDefaults = RNText as unknown as TextWithDefaults;
RNTextWithDefaults.defaultProps = {
  ...(RNTextWithDefaults.defaultProps ?? {}),
  maxFontSizeMultiplier: 1.4,
};

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
  const { isDark, colors } = useAppTheme();
  const theme = buildPaperTheme(isDark);

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: (props) => <MaterialCommunityIcons {...props} />,
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitle: '',
          gestureEnabled: true,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
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

    const inWelcome = segments[0] === 'welcome';

    if (!hasCompletedOnboarding && !inWelcome) {
      router.replace('/welcome');
    } else if (hasCompletedOnboarding && inWelcome) {
      router.replace('/(tabs)');
    }
  }, [isReady, hasCompletedOnboarding, segments, router]);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;

      // Re-schedule daily reminder if enabled
      const { dailyReminderEnabled, dailyReminderTime } = useSettingsStore.getState().settings;
      if (dailyReminderEnabled) {
        const { hour, minute } = parseTimeString(dailyReminderTime);
        void scheduleDailyReminder(hour, minute);
      }

      // Auto-sync if user is signed in
      const user = useAuthStore.getState().user;
      const { autoSync, lastSyncTime, syncNow } = useSyncStore.getState();
      if (!user || !autoSync || !isSupabaseConfigured()) return;
      const fiveMin = 5 * 60 * 1000;
      if (lastSyncTime != null && Date.now() - lastSyncTime < fiveMin) return;
      await syncNow();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isReady, fontsLoaded]);

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
