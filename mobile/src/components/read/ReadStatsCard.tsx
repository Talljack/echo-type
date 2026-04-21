import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { calculateStats, type WordResult } from '@/lib/read-feedback';
import { fontFamily } from '@/theme/typography';

interface ReadStatsCardProps {
  results: WordResult[];
}

export function ReadStatsCard({ results }: ReadStatsCardProps) {
  const { colors, getModuleColors } = useAppTheme();
  const readColors = getModuleColors('read');
  const stats = useMemo(() => calculateStats(results), [results]);

  const metricRows = [
    { label: 'Accuracy', value: `${stats.accuracy}%` },
    { label: 'Correct', value: String(stats.correct) },
    { label: 'Close', value: String(stats.close) },
    { label: 'Wrong', value: String(stats.wrong) },
    { label: 'Missing', value: String(stats.missing) },
    { label: 'Extra', value: String(stats.extra) },
  ];

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
            Your Results
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {stats.total} target words
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroRing, { borderColor: readColors.primary, backgroundColor: colors.surfaceVariant }]}>
            <Text variant="headlineMedium" style={[styles.heroValue, { color: readColors.primary }]}>
              {stats.accuracy}%
            </Text>
            <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant }}>
              Accuracy
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {metricRows.map((item) => (
            <View
              key={item.label}
              style={[styles.metricCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}
            >
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                {item.label}
              </Text>
              <Text variant="titleMedium" style={[styles.metricValue, { color: colors.onSurface }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  content: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamily.headingBold,
  },
  hero: {
    alignItems: 'center',
  },
  heroRing: {
    width: 132,
    height: 132,
    borderRadius: 999,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroValue: {
    fontFamily: fontFamily.headingBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '31%',
    minWidth: 96,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  metricValue: {
    fontFamily: fontFamily.bodyMedium,
  },
});
