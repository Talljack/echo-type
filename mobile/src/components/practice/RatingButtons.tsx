import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Rating } from '@/lib/fsrs';
import { colors } from '@/theme/colors';
import { componentRadius, radius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  intervals?: {
    [Rating.Again]: string;
    [Rating.Hard]: string;
    [Rating.Good]: string;
    [Rating.Easy]: string;
  };
}

export function RatingButtons({ onRate, intervals }: RatingButtonsProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        How well did you do?
      </Text>

      <View style={styles.buttonGrid}>
        <View style={styles.buttonWrapper}>
          <Button
            mode="contained"
            onPress={() => onRate(Rating.Again)}
            style={[styles.button, styles.againButton]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
            accessibilityLabel="Again - Forgot completely"
            accessibilityRole="button"
          >
            Again
          </Button>
          {intervals && (
            <Text variant="bodySmall" style={styles.interval}>
              {intervals[Rating.Again]}
            </Text>
          )}
        </View>

        <View style={styles.buttonWrapper}>
          <Button
            mode="contained"
            onPress={() => onRate(Rating.Hard)}
            style={[styles.button, styles.hardButton]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
            accessibilityLabel="Hard - Remembered with difficulty"
            accessibilityRole="button"
          >
            Hard
          </Button>
          {intervals && (
            <Text variant="bodySmall" style={styles.interval}>
              {intervals[Rating.Hard]}
            </Text>
          )}
        </View>

        <View style={styles.buttonWrapper}>
          <Button
            mode="contained"
            onPress={() => onRate(Rating.Good)}
            style={[styles.button, styles.goodButton]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
            accessibilityLabel="Good - Remembered with some effort"
            accessibilityRole="button"
          >
            Good
          </Button>
          {intervals && (
            <Text variant="bodySmall" style={styles.interval}>
              {intervals[Rating.Good]}
            </Text>
          )}
        </View>

        <View style={styles.buttonWrapper}>
          <Button
            mode="contained"
            onPress={() => onRate(Rating.Easy)}
            style={[styles.button, styles.easyButton]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
            accessibilityLabel="Easy - Remembered easily"
            accessibilityRole="button"
          >
            Easy
          </Button>
          {intervals && (
            <Text variant="bodySmall" style={styles.interval}>
              {intervals[Rating.Easy]}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.legend}>
        <Text variant="bodySmall" style={styles.legendText}>
          • Again: Forgot completely
        </Text>
        <Text variant="bodySmall" style={styles.legendText}>
          • Hard: Remembered with difficulty
        </Text>
        <Text variant="bodySmall" style={styles.legendText}>
          • Good: Remembered with some effort
        </Text>
        <Text variant="bodySmall" style={styles.legendText}>
          • Easy: Remembered easily
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: componentRadius.card,
    padding: componentSpacing.cardPadding,
    marginVertical: spacing.md,
    ...shadows.sm,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
    color: colors.onSurface,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: radius.sm,
  },
  buttonContent: {
    minHeight: componentSpacing.touchTargetMin, // Ensure 44pt touch target
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  againButton: {
    backgroundColor: colors.error,
  },
  hardButton: {
    backgroundColor: colors.warning,
  },
  goodButton: {
    backgroundColor: colors.success,
  },
  easyButton: {
    backgroundColor: colors.info,
  },
  interval: {
    marginTop: spacing.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  legendText: {
    color: colors.onSurfaceVariant,
  },
});
