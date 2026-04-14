import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Rating } from '@/lib/fsrs';

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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  againButton: {
    backgroundColor: '#EF4444',
  },
  hardButton: {
    backgroundColor: '#F59E0B',
  },
  goodButton: {
    backgroundColor: '#10B981',
  },
  easyButton: {
    backgroundColor: '#3B82F6',
  },
  interval: {
    marginTop: 4,
    color: '#6B7280',
    textAlign: 'center',
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 4,
  },
  legendText: {
    color: '#6B7280',
  },
});
