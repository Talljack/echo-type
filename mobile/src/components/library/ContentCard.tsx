import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { createAccessibilityLabel, formatProgressForA11y, MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';
import { colors } from '@/theme/colors';
import { componentRadius, radius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';
import type { Content } from '@/types/content';

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  onToggleFavorite: () => void;
  onEdit?: (contentId: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ContentCard({ content, onPress, onToggleFavorite }: ContentCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Create accessible label
  const accessibilityLabel = createAccessibilityLabel([
    content.title,
    `Difficulty: ${content.difficulty}`,
    `Language: ${content.language}`,
    content.progress > 0 ? formatProgressForA11y(content.progress, 100) : undefined,
    content.isFavorite ? 'Favorited' : undefined,
  ]);

  const favoriteHint = content.isFavorite ? 'Double tap to remove from favorites' : 'Double tap to add to favorites';

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view content details"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {content.title}
          </Text>
          <IconButton
            icon={content.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            iconColor={content.isFavorite ? colors.error : colors.onSurfaceVariant}
            style={styles.favoriteButton}
            accessibilityLabel={content.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityHint={favoriteHint}
            accessibilityState={{ checked: content.isFavorite }}
          />
        </View>

        <View style={styles.meta}>
          <Text variant="bodySmall" style={styles.metaText}>
            {content.difficulty} • {content.language}
          </Text>
          {content.progress > 0 && (
            <View
              style={styles.progressBar}
              accessibilityRole="progressbar"
              accessibilityLabel="Reading progress"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: content.progress,
                text: `${Math.round(content.progress)}% complete`,
              }}
            >
              <View style={[styles.progressFill, { width: `${content.progress}%` }]} />
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: componentRadius.card,
    padding: componentSpacing.cardPadding,
    marginBottom: spacing.md,
    ...shadows.sm,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
    color: colors.onSurface,
  },
  favoriteButton: {
    margin: 0,
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  meta: {
    gap: spacing.sm,
  },
  metaText: {
    color: colors.onSurfaceVariant,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.xs,
  },
});
