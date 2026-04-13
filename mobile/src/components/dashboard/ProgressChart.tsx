import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    total: number;
    color: string;
  }[];
}

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Module Progress
      </Text>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
          return (
            <View key={index} style={styles.row}>
              <View style={styles.labelContainer}>
                <Text variant="bodyMedium" style={styles.label}>
                  {item.label}
                </Text>
                <Text variant="bodySmall" style={styles.stats}>
                  {item.value} / {item.total}
                </Text>
              </View>
              <View style={styles.barContainer}>
                <View style={styles.barBackground}>
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
                <Text variant="labelSmall" style={styles.percentage}>
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#374151',
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
    color: '#374151',
    fontWeight: '500',
  },
  stats: {
    color: '#6B7280',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    color: '#6B7280',
    width: 40,
    textAlign: 'right',
  },
});
