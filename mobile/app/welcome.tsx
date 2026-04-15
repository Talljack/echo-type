import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/stores/useSettingsStore';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, getModuleColors } = useAppTheme();
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0F9FF', '#E0F2FE', '#BAE6FD']} style={styles.gradient}>
        {/* Floating background blobs */}
        <Animated.View style={[styles.blob, styles.blob1, { transform: [{ translateY: blob1Y }] }]} />
        <Animated.View style={[styles.blob, styles.blob2, { transform: [{ translateY: blob2Y }] }]} />

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
          <View style={styles.iconContainer}>
            <LinearGradient colors={['#007AFF', '#0051D5']} style={styles.iconGradient}>
              <MaterialCommunityIcons name="book-alphabet" size={56} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>EchoType</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Master Languages Through</Text>
          <Text style={styles.subtitleHighlight}>Listen • Speak • Read • Write</Text>

          {/* Features Grid (2x2) */}
          <View style={styles.featuresGrid}>
            <FeatureCard icon="headphones" title="Listen" gradient={listenColors.gradient} animValue={card1Anim} />
            <FeatureCard icon="microphone" title="Speak" gradient={speakColors.gradient} animValue={card2Anim} />
            <FeatureCard icon="book-open-variant" title="Read" gradient={readColors.gradient} animValue={card3Anim} />
            <FeatureCard icon="pencil" title="Write" gradient={writeColors.gradient} animValue={card4Anim} />
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [styles.pressableButton, pressed && styles.pressableButtonPressed]}
            >
              <LinearGradient
                colors={['#007AFF', '#0051D5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientButton}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </Pressable>
            <Text style={styles.hint}>No account needed • Start learning now</Text>
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
}: {
  icon: string;
  title: string;
  gradient: string[];
  animValue: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.featureCard,
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
      <LinearGradient colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']} style={styles.cardGradient}>
        <LinearGradient colors={gradient} style={styles.iconCircle}>
          <MaterialCommunityIcons name={icon as any} size={32} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.cardTitle}>{title}</Text>
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
    backgroundColor: '#60A5FA',
    top: -100,
    left: -120,
  },
  blob2: {
    width: 260,
    height: 260,
    backgroundColor: '#3B82F6',
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
    shadowColor: '#007AFF',
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
    fontSize: 48,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  subtitleHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
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
    width: (width - 72) / 2,
    maxWidth: 180,
    aspectRatio: 1.1,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
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
    shadowColor: '#007AFF',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
