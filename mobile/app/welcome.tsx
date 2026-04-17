import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { darkColors, lightColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, isDark, getModuleColors } = useAppTheme();
  const setOnboardingCompleted = useSettingsStore((state) => state.setOnboardingCompleted);

  // Get module colors
  const listenColors = getModuleColors('listen');
  const speakColors = getModuleColors('speak');
  const readColors = getModuleColors('read');
  const writeColors = getModuleColors('write');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  // Feature cards animation
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const card4Anim = useRef(new Animated.Value(0)).current;

  // Floating blob animations
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered feature cards animation
    const staggerDelay = 100;
    setTimeout(() => {
      Animated.spring(card1Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);

    setTimeout(() => {
      Animated.spring(card2Anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200 + staggerDelay);

    setTimeout(
      () => {
        Animated.spring(card3Anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      },
      200 + staggerDelay * 2,
    );

    setTimeout(
      () => {
        Animated.spring(card4Anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      },
      200 + staggerDelay * 3,
    );

    // Floating blob animations
    const createFloatingAnimation = (animValue: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 20,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: -20,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createFloatingAnimation(blob1Y).start();
    setTimeout(() => createFloatingAnimation(blob2Y).start(), 1500);
  }, [blob1Y, blob2Y, fadeAnim, scaleAnim, slideUpAnim, card1Anim, card2Anim, card3Anim, card4Anim]);

  const handleGetStarted = async () => {
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still navigate even if storage fails
      router.replace('/(tabs)');
    }
  };

  const bgGradient = isDark
    ? ([colors.background, colors.backgroundSecondary, colors.primaryContainer] as const)
    : (['#F5F3FF', '#EEF2FF', '#E0E7FF'] as const);

  return (
    <View style={styles.container}>
      <LinearGradient colors={bgGradient} style={styles.gradient}>
        {/* Floating background blobs */}
        <Animated.View
          style={[
            styles.blob,
            styles.blob1,
            { backgroundColor: colors.primaryLight, transform: [{ translateY: blob1Y }] },
          ]}
        />
        <Animated.View
          style={[styles.blob, styles.blob2, { backgroundColor: colors.primary, transform: [{ translateY: blob2Y }] }]}
        />

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideUpAnim }],
            },
          ]}
        >
          {/* Logo/Icon */}
          <View style={[styles.iconContainer, { shadowColor: colors.primary }]}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.iconGradient}>
              <MaterialCommunityIcons name="book-alphabet" size={56} color={colors.onPrimary} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.onBackground }]}>EchoType</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>Master Languages Through</Text>
          <Text style={[styles.subtitleHighlight, { color: colors.primary }]}>Listen • Speak • Read • Write</Text>

          {/* Features Grid (2x2) */}
          <View style={styles.featuresGrid}>
            <FeatureCard
              icon="headphones"
              title="Listen"
              gradient={listenColors.gradient}
              animValue={card1Anim}
              layoutWidth={width}
              isDark={isDark}
              colors={colors}
            />
            <FeatureCard
              icon="microphone"
              title="Speak"
              gradient={speakColors.gradient}
              animValue={card2Anim}
              layoutWidth={width}
              isDark={isDark}
              colors={colors}
            />
            <FeatureCard
              icon="book-open-variant"
              title="Read"
              gradient={readColors.gradient}
              animValue={card3Anim}
              layoutWidth={width}
              isDark={isDark}
              colors={colors}
            />
            <FeatureCard
              icon="pencil"
              title="Write"
              gradient={writeColors.gradient}
              animValue={card4Anim}
              layoutWidth={width}
              isDark={isDark}
              colors={colors}
            />
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.pressableButton,
                { shadowColor: colors.primary },
                pressed && styles.pressableButtonPressed,
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <View style={styles.buttonContent}>
                  <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Get Started</Text>
                  <MaterialCommunityIcons name="arrow-right" size={24} color={colors.onPrimary} />
                </View>
              </LinearGradient>
            </Pressable>
            <Text style={[styles.hint, { color: colors.onSurfaceSecondary }]}>
              No account needed • Start learning now
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  gradient,
  animValue,
  layoutWidth,
  isDark,
  colors,
}: {
  icon: string;
  title: string;
  gradient: readonly [string, string];
  animValue: Animated.Value;
  layoutWidth: number;
  isDark: boolean;
  colors: typeof lightColors | typeof darkColors;
}) {
  const cardSurfaceGradient = isDark
    ? ([colors.surfaceElevated, colors.surface] as const)
    : (['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'] as const);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        { width: (layoutWidth - 72) / 2 },
        {
          opacity: animValue,
          transform: [
            {
              scale: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient colors={cardSurfaceGradient} style={[styles.cardGradient, { shadowColor: colors.primary }]}>
        <LinearGradient colors={gradient} style={[styles.iconCircle, { shadowColor: colors.shadowHeavy }]}>
          <MaterialCommunityIcons
            name={icon as ComponentProps<typeof MaterialCommunityIcons>['name']}
            size={32}
            color={colors.onPrimary}
          />
        </LinearGradient>
        <Text style={[styles.cardTitle, { color: colors.onBackground }]}>{title}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.25,
  },
  blob1: {
    width: 300,
    height: 300,
    top: -100,
    left: -120,
  },
  blob2: {
    width: 260,
    height: 260,
    bottom: -80,
    right: -100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 32,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontFamily: fontFamily.headingBold,
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  subtitleHighlight: {
    fontFamily: fontFamily.heading,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 48,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
    width: '100%',
    maxWidth: 400,
  },
  featureCard: {
    maxWidth: 180,
    aspectRatio: 1.1,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: fontFamily.heading,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
  },
  pressableButton: {
    width: '100%',
    borderRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pressableButtonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
  },
  gradientButton: {
    width: '100%',
    height: 64,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    fontFamily: fontFamily.heading,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
