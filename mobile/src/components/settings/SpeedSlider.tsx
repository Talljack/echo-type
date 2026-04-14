/**
 * TTS Speed Slider Component
 * Allows users to adjust text-to-speech playback speed
 */
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { componentSpacing, spacing } from '@/theme/spacing';

interface SpeedSliderProps {
  value: number; // 0.5 - 2.0
  onChange: (value: number) => void;
  onPreview?: () => void;
}

export function SpeedSlider({ value, onChange, onPreview }: SpeedSliderProps) {
  const { colors } = useAppTheme();
  const [localValue, setLocalValue] = useState(value);

  const handleValueChange = (newValue: number) => {
    // Round to nearest 0.25
    const rounded = Math.round(newValue * 4) / 4;
    setLocalValue(rounded);
  };

  const handleSlidingComplete = (newValue: number) => {
    const rounded = Math.round(newValue * 4) / 4;
    onChange(rounded);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurfaceVariant }]}>
          Playback Speed
        </Text>
        <View style={styles.valueContainer}>
          <Text variant="titleMedium" style={[styles.value, { color: colors.primary }]}>
            {localValue.toFixed(2)}x
          </Text>
          {onPreview && (
            <IconButton
              icon="play-circle"
              size={20}
              onPress={onPreview}
              iconColor={colors.primary}
              accessibilityLabel="Preview speed"
            />
          )}
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Text variant="bodySmall" style={[styles.minLabel, { color: colors.onSurfaceSecondary }]}>
          0.5x
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.25}
          value={value}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          accessibilityLabel="TTS speed slider"
          accessibilityValue={{ min: 0.5, max: 2.0, now: localValue }}
        />
        <Text variant="bodySmall" style={[styles.maxLabel, { color: colors.onSurfaceSecondary }]}>
          2.0x
        </Text>
      </View>

      <View style={styles.marks}>
        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((mark) => (
          <View
            key={mark}
            style={[
              styles.mark,
              mark === localValue && { backgroundColor: colors.primary },
              { backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  minLabel: {
    width: 32,
  },
  maxLabel: {
    width: 32,
    textAlign: 'right',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  marks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: spacing.xs,
  },
  mark: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
