import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import type { darkColors, lightColors } from '@/theme/colors';

const PARTICLE_COUNT = 14;
const DOT_SIZE = 10;

type ThemeColors = typeof lightColors | typeof darkColors;

interface CompletionConfettiProps {
  colors: ThemeColors;
}

interface ParticleConfig {
  angle: number;
  distance: number;
  delay: number;
  color: string;
}

function ConfettiDot({ config }: { config: ParticleConfig }) {
  const { angle, distance, delay, color } = config;
  const travel = useSharedValue(0);
  const scale = useSharedValue(0.35);
  const fade = useSharedValue(1);

  useEffect(() => {
    travel.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 120 }));
    scale.value = withDelay(delay, withSpring(1.15, { damping: 10, stiffness: 180 }));
    fade.value = withDelay(delay + 350, withTiming(0, { duration: 650 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount burst only
  }, [delay]);

  const style = useAnimatedStyle(() => {
    const t = travel.value;
    const dx = Math.cos(angle) * distance * t;
    const dy = Math.sin(angle) * distance * t;
    return {
      opacity: fade.value,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: scale.value * (0.85 + 0.15 * (1 - t)) }],
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function CompletionConfetti({ colors }: CompletionConfettiProps) {
  const palette = useMemo(
    () => [
      colors.primary,
      colors.secondary,
      colors.accent,
      colors.accentOrange,
      colors.accentPink,
      colors.accentTeal,
      colors.accentYellow,
      colors.primaryLight,
      colors.success,
      colors.warning,
    ],
    [colors],
  );

  const particles = useMemo((): ParticleConfig[] => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (Math.PI * 2 * i) / PARTICLE_COUNT + (i % 3) * 0.22,
      distance: 72 + (i % 5) * 16 + (i % 2) * 8,
      delay: i * 42,
      color: palette[i % palette.length]!,
    }));
  }, [palette]);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.burst}>
        {particles.map((config, i) => (
          <ConfettiDot key={i} config={config} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  burst: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
