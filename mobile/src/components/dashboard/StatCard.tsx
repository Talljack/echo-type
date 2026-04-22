import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StatCard({ label, value, icon, color, subtitle, onPress }: StatCardProps) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const displayColor = color ?? colors.primary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const containerStyle = [styles.container, { backgroundColor: colors.surface }];

  const content = (
    <View style={styles.content}>
      <Text variant="labelMedium" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
        {label}
      </Text>
      <Text variant="headlineLarge" style={[styles.value, { color: displayColor }]}>
        {value}
      </Text>
      {subtitle && (
        <Text variant="bodySmall" style={[styles.subtitle, { color: colors.onSurfaceSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        style={[containerStyle, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
        accessibilityHint="Double tap to view details"
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={containerStyle}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: 100,
    borderCurve: 'continuous',
  },
  content: {
    alignItems: 'flex-start',
  },
  label: {
    textTransform: 'uppercase',
    fontWeight: '600',
    fontFamily: fontFamily.bodyMedium,
    marginBottom: 8,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fontFamily.headingBold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 12,
  },
});
