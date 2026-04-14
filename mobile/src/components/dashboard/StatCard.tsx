import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { componentRadius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StatCard({ label, value, icon, color = colors.primary, subtitle, onPress }: StatCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const content = (
    <View style={styles.content}>
      <Text variant="labelMedium" style={styles.label}>
        {label}
      </Text>
      <Text variant="headlineLarge" style={[styles.value, { color }]}>
        {value}
      </Text>
      {subtitle && (
        <Text variant="bodySmall" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        style={[styles.container, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: componentRadius.card,
    padding: componentSpacing.cardPadding,
    ...shadows.sm,
    flex: 1,
    minWidth: 150,
  },
  content: {
    alignItems: 'flex-start',
  },
  label: {
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.onSurfaceSecondary,
  },
});
