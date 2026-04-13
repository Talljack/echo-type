import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface TypingStatsProps {
  wpm: number;
  accuracy: number;
  timeElapsed: number; // seconds
}

export function TypingStats({ wpm, accuracy, timeElapsed }: TypingStatsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text variant="headlineSmall" style={styles.value}>
          {wpm}
        </Text>
        <Text variant="labelSmall" style={styles.label}>
          WPM
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Text variant="headlineSmall" style={styles.value}>
          {accuracy}%
        </Text>
        <Text variant="labelSmall" style={styles.label}>
          Accuracy
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Text variant="headlineSmall" style={styles.value}>
          {formatTime(timeElapsed)}
        </Text>
        <Text variant="labelSmall" style={styles.label}>
          Time
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  label: {
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
});
