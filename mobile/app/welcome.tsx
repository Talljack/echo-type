import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'echotype_onboarding_completed';

// Helper functions for cross-platform storage
const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

export default function WelcomeScreen() {
  const router = useRouter();

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
    console.log('Get Started button pressed');
    try {
      await setStorageItem(ONBOARDING_KEY, 'true');
      console.log('Onboarding state saved successfully');

      // Small delay to ensure storage is persisted
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For web, dispatch event and navigate
      if (Platform.OS === 'web') {
        window.dispatchEvent(new Event('onboarding-completed'));
        window.location.href = '/';
      } else {
        // For native, use push instead of replace to avoid navigation loop
        router.push('/(tabs)');
      }
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
      // Try to navigate anyway
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        router.push('/(tabs)');
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EEF2FF', '#E0E7FF', '#DDD6FE']} style={styles.gradient}>
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
            <LinearGradient colors={['#A78BFA', '#8B5CF6', '#7C3AED']} style={styles.iconGradient}>
              <MaterialCommunityIcons name="headphones" size={56} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>EchoType</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Master Languages Through</Text>
          <Text style={styles.subtitleHighlight}>Listen • Speak • Read • Write</Text>

          {/* Features Grid (2x2) */}
          <View style={styles.featuresGrid}>
            <FeatureCard icon="ear-hearing" title="Listen" color="#8B5CF6" animValue={card1Anim} />
            <FeatureCard icon="microphone" title="Speak" color="#7C3AED" animValue={card2Anim} />
            <FeatureCard icon="book-open-variant" title="Read" color="#6D28D9" animValue={card3Anim} />
            <FeatureCard icon="pencil" title="Write" color="#5B21B6" animValue={card4Anim} />
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [styles.pressableButton, pressed && styles.pressableButtonPressed]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
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
  color,
  animValue,
}: {
  icon: string;
  title: string;
  color: string;
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
      <LinearGradient colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']} style={styles.cardGradient}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon as any} size={28} color="#FFFFFF" />
        </View>
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
    width: 280,
    height: 280,
    backgroundColor: '#A78BFA',
    top: -80,
    left: -100,
  },
  blob2: {
    width: 240,
    height: 240,
    backgroundColor: '#7C3AED',
    bottom: -60,
    right: -80,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: '#7C3AED',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
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
    borderRadius: 28,
    shadowColor: '#7C3AED',
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
    height: 60,
    borderRadius: 28,
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
