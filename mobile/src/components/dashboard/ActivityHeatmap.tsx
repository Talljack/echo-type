import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ActivityHeatmapProps {
  data: { date: string; count: number }[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Get last 12 weeks of data
  const weeks = 12;
  const daysPerWeek = 7;
  const today = new Date();

  // Generate grid data
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
    if (count === 0) return '#E5E7EB';
    if (count < 3) return '#C7D2FE';
    if (count < 6) return '#A5B4FC';
    if (count < 9) return '#818CF8';
    return '#6366F1';
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Activity
      </Text>
      <View style={styles.grid}>
        {gridData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((day, dayIndex) => (
              <View
                key={dayIndex}
                style={[
                  styles.day,
                  {
                    backgroundColor: getColor(day.count),
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text variant="labelSmall" style={styles.legendText}>
          Less
        </Text>
        <View style={[styles.legendBox, { backgroundColor: '#E5E7EB' }]} />
        <View style={[styles.legendBox, { backgroundColor: '#C7D2FE' }]} />
        <View style={[styles.legendBox, { backgroundColor: '#A5B4FC' }]} />
        <View style={[styles.legendBox, { backgroundColor: '#818CF8' }]} />
        <View style={[styles.legendBox, { backgroundColor: '#6366F1' }]} />
        <Text variant="labelSmall" style={styles.legendText}>
          More
        </Text>
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
  legendText: {
    color: '#6B7280',
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
