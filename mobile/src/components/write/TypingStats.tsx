import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';

interface TypingStatsProps {
  wpm: number;
  accuracy: number;
  timeElapsed: number; // seconds
}

export function TypingStats({ wpm, accuracy, timeElapsed }: TypingStatsProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useI18n();
  const dividerColor = colors.borderLight;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.stat}>
        <Text variant="headlineSmall" style={[styles.value, { color: colors.primary }]}>
          {wpm}
        </Text>
        <Text variant="labelSmall" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
          {t('write.wpm')}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      <View style={styles.stat}>
        <Text variant="headlineSmall" style={[styles.value, { color: colors.primary }]}>
          {accuracy}%
        </Text>
        <Text variant="labelSmall" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
          {t('write.accuracy')}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      <View style={styles.stat}>
        <Text variant="headlineSmall" style={[styles.value, { color: colors.primary }]}>
          {formatTime(timeElapsed)}
        </Text>
        <Text variant="labelSmall" style={[styles.label, { color: colors.onSurfaceSecondary }]}>
          {t('write.time')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
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
    marginBottom: 4,
  },
  label: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 40,
  },
});
