import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '@/components/ui/Button';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'echotype_onboarding_completed';

export default function WelcomeScreen() {
  const _theme = useTheme();
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Floating blob animations
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const blob3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating blob animations
    const createFloatingAnimation = (animValue: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: -20,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 20,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createFloatingAnimation(blob1Y).start();
    setTimeout(() => createFloatingAnimation(blob2Y).start(), 500);
    setTimeout(() => createFloatingAnimation(blob3Y).start(), 1000);
  }, [blob1Y, blob2Y, blob3Y, fadeAnim, scaleAnim, slideAnim]);

  const handleGetStarted = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EEF2FF', '#E0E7FF', '#C7D2FE']} style={styles.gradient}>
        {/* Floating background blobs */}
        <Animated.View style={[styles.blob, styles.blob1, { transform: [{ translateY: blob1Y }] }]} />
        <Animated.View style={[styles.blob, styles.blob2, { transform: [{ translateY: blob2Y }] }]} />
        <Animated.View style={[styles.blob, styles.blob3, { transform: [{ translateY: blob3Y }] }]} />

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo/Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.iconGradient}>
              <MaterialCommunityIcons name="headphones" size={80} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text variant="displayLarge" style={styles.title}>
            EchoType
          </Text>

          {/* Subtitle */}
          <Text variant="headlineSmall" style={styles.subtitle}>
            Master Languages Through
          </Text>
          <Text variant="headlineSmall" style={styles.subtitleHighlight}>
            Listen • Speak • Read • Write
          </Text>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="ear-hearing" text="Immersive Listening" delay={200} />
            <FeatureItem icon="microphone" text="Speaking Practice" delay={400} />
            <FeatureItem icon="book-open-variant" text="Reading Comprehension" delay={600} />
            <FeatureItem icon="pencil" text="Writing Exercises" delay={800} />
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Get Started
            </Button>
            <Text variant="bodySmall" style={styles.hint}>
              No account needed • Start learning now
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, [delay, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.featureIcon}>
        <MaterialCommunityIcons name={icon as any} size={24} color="#7C3AED" />
      </View>
      <Text variant="bodyLarge" style={styles.featureText}>
        {text}
      </Text>
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
    opacity: 0.3,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: '#A78BFA',
    top: -100,
    left: -100,
  },
  blob2: {
    width: 250,
    height: 250,
    backgroundColor: '#7C3AED',
    top: height * 0.3,
    right: -80,
  },
  blob3: {
    width: 200,
    height: 200,
    backgroundColor: '#818CF8',
    bottom: -50,
    left: width * 0.3,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#4F46E5',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleHighlight: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 48,
  },
  features: {
    width: '100%',
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#312E81',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 28,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonContent: {
    height: 56,
  },
  hint: {
    marginTop: 16,
    color: '#6366F1',
    textAlign: 'center',
  },
});
