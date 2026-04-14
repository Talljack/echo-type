import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';
import { PronunciationResult } from '@/services/pronunciation-api';

interface PronunciationTipsProps {
  result: PronunciationResult;
}

export function PronunciationTips({ result }: PronunciationTipsProps) {
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
            <Text variant="bodyMedium" style={styles.sectionTitle}>
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
            <Text variant="bodyMedium" style={styles.sectionTitle}>
              Improvement Suggestions:
            </Text>
            {result.tips.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text variant="bodySmall" style={styles.bullet}>
                  •
                </Text>
                <Text variant="bodySmall" style={styles.tipText}>
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

function getWordColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
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
    color: '#374151',
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
    color: '#6366F1',
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    color: '#4B5563',
    lineHeight: 20,
  },
});
