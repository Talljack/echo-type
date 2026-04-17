import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { fontFamily } from '@/theme/typography';

interface ActivityHeatmapProps {
  data: { date: string; count: number }[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { colors, isDark } = useAppTheme();
  const weeks = 12;
  const daysPerWeek = 7;
  const today = new Date();

  const gridData: { date: Date; count: number }[][] = [];

  for (let week = weeks - 1; week >= 0; week--) {
    const weekData: { date: Date; count: number }[] = [];
    for (let day = 0; day < daysPerWeek; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (week * daysPerWeek + (daysPerWeek - 1 - day)));

      const dateStr = date.toISOString().split('T')[0];
      const activity = data.find((d) => d.date === dateStr);

      weekData.push({
        date,
        count: activity?.count || 0,
      });
    }
    gridData.push(weekData);
  }

  const getColor = (count: number) => {
    const empty = isDark ? '#2C2C2E' : '#E5E7EB';
    if (count === 0) return empty;
    if (count < 3) return '#C7D2FE';
    if (count < 6) return '#A5B4FC';
    if (count < 9) return '#818CF8';
    return '#6366F1';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
        Activity
      </Text>
      <View style={styles.grid}>
        {gridData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <View key={dayIndex} style={[styles.day, { backgroundColor: getColor(day.count) }]} />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
          Less
        </Text>
        {[isDark ? '#2C2C2E' : '#E5E7EB', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'].map((c) => (
          <View key={c} style={[styles.legendBox, { backgroundColor: c }]} />
        ))}
        <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
          More
        </Text>
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
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  week: {
    flexDirection: 'column',
    gap: 3,
  },
  day: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
