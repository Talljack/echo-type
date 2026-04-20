import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { PronunciationResult } from '@/services/pronunciation-api';

interface PronunciationTipsProps {
  result: PronunciationResult;
}

export function PronunciationTips({ result }: PronunciationTipsProps) {
  const { colors } = useAppTheme();

  const getWordColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  if (result.tips.length === 0 && !hasWeakWords(result)) {
    return null;
  }

  const weakWords = result.words.filter((w) => w.score < 70);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          💡 Pronunciation Tips
        </Text>

        {/* Weak Words */}
        {weakWords.length > 0 && (
          <View style={styles.section}>
            <Text variant="bodyMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Words to Practice:
            </Text>
            <View style={styles.chipContainer}>
              {weakWords.map((w, i) => (
                <Chip
                  key={i}
                  mode="outlined"
                  style={[styles.chip, { borderColor: getWordColor(w.score) }]}
                  textStyle={{ color: getWordColor(w.score) }}
                >
                  {w.word} ({w.score})
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* General Tips */}
        {result.tips.length > 0 && (
          <View style={styles.section}>
            <Text variant="bodyMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Improvement Suggestions:
            </Text>
            {result.tips.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text variant="bodySmall" style={[styles.bullet, { color: colors.primary }]}>
                  •
                </Text>
                <Text variant="bodySmall" style={[styles.tipText, { color: colors.onSurface }]}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function hasWeakWords(result: PronunciationResult): boolean {
  return result.words.some((w) => w.score < 70);
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 0,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    marginRight: 8,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
  },
});
