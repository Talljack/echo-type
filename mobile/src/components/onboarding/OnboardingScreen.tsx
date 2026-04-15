/**
 * Onboarding Screen Component
 * 3-screen onboarding flow with smooth transitions
 */
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingPage {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: 'book-open-variant',
    iconColor: colors.primary,
    title: 'Welcome to Echo Type',
    description: 'Master languages through immersive reading, listening, speaking, and writing practice.',
  },
  {
    icon: 'brain',
    iconColor: colors.accent,
    title: 'AI-Powered Learning',
    description: 'Get personalized content, instant feedback, and smart spaced repetition to accelerate your progress.',
  },
  {
    icon: 'rocket-launch',
    iconColor: colors.accentOrange,
    title: 'Ready to Start?',
    description: 'Import your first content or let AI generate practice materials tailored to your level.',
  },
];

export function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({ x: nextPage * SCREEN_WIDTH, animated: true });
      setCurrentPage(nextPage);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  const handleGetStarted = () => {
    setOnboardingCompleted(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={handleSkip}
          textColor={colors.onSurfaceVariant}
          style={styles.skipButton}
          accessibilityLabel="Skip onboarding"
          accessibilityHint="Skips the introduction and goes to the main app"
        >
          Skip
        </Button>
      </View>

      {/* Scrollable Pages */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(page);
        }}
      >
        {PAGES.map((page, index) => (
          <OnboardingPage key={index} page={page} />
        ))}
      </Animated.ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {PAGES.map((_, index) => (
          <PageIndicator key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
          accessibilityLabel={currentPage === PAGES.length - 1 ? 'Get started' : 'Next'}
          accessibilityHint={
            currentPage === PAGES.length - 1 ? 'Completes onboarding and opens the app' : 'Shows the next screen'
          }
        >
          {currentPage === PAGES.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

interface OnboardingPageProps {
  page: OnboardingPage;
}

function OnboardingPage({ page }: OnboardingPageProps) {
  return (
    <View style={styles.page}>
      <View style={styles.iconContainer}>
        <Icon name={page.icon} size={120} color={page.iconColor} />
      </View>
      <Text variant="headlineLarge" style={styles.title}>
        {page.title}
      </Text>
      <Text variant="bodyLarge" style={styles.description}>
        {page.description}
      </Text>
    </View>
  );
}

interface PageIndicatorProps {
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
}

function PageIndicator({ index, scrollX }: PageIndicatorProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

    const width = withSpring(
      scrollX.value >= index * SCREEN_WIDTH - SCREEN_WIDTH / 2 &&
        scrollX.value <= index * SCREEN_WIDTH + SCREEN_WIDTH / 2
        ? 24
        : 8,
      { damping: 15, stiffness: 300 },
    );

    const opacity = withSpring(
      scrollX.value >= index * SCREEN_WIDTH - SCREEN_WIDTH / 2 &&
        scrollX.value <= index * SCREEN_WIDTH + SCREEN_WIDTH / 2
        ? 1
        : 0.3,
      { damping: 15, stiffness: 300 },
    );

    return {
      width,
      opacity,
    };
  });

  return <Animated.View style={[styles.indicator, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-end',
  },
  skipButton: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    color: colors.onBackground,
  },
  description: {
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  nextButton: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  nextButtonContent: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
});
