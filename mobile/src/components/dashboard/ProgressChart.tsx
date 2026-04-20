import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    total: number;
    color: string;
  }[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  const { colors } = useAppTheme();
  const barBg = colors.surfaceVariant;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
        Module Progress
      </Text>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
          return (
            <View key={index} style={styles.row}>
              <View style={styles.labelContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurface }]}>
                  {item.label}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                  {item.value} / {item.total}
                </Text>
              </View>
              <View style={styles.barContainer}>
                <View style={[styles.barBackground, { backgroundColor: barBg }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <Text variant="labelSmall" style={[styles.percentage, { color: colors.onSurfaceSecondary }]}>
                  {Math.round(percentage)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderCurve: 'continuous',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartContainer: {
    gap: 16,
  },
  row: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontWeight: '500',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    width: 40,
    textAlign: 'right',
  },
});
