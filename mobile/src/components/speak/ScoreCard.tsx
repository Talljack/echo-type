import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import type { PronunciationScore } from '@/lib/voice';

interface ScoreCardProps {
  score: PronunciationScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return '#10B981';
    if (value >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    return 'Needs Practice';
  };

  return (
    <View style={styles.container}>
      {/* Overall Score */}
      <View style={styles.overallSection}>
        <Text variant="headlineLarge" style={[styles.overallScore, { color: getScoreColor(score.overall) }]}>
          {score.overall}
        </Text>
        <Text variant="labelLarge" style={styles.overallLabel}>
          {getScoreLabel(score.overall)}
        </Text>
      </View>

      {/* Detailed Scores */}
      <View style={styles.detailsSection}>
        <ScoreItem label="Accuracy" value={score.accuracy} color={getScoreColor(score.accuracy)} />
        <ScoreItem label="Fluency" value={score.fluency} color={getScoreColor(score.fluency)} />
        <ScoreItem label="Completeness" value={score.completeness} color={getScoreColor(score.completeness)} />
      </View>
    </View>
  );
}

interface ScoreItemProps {
  label: string;
  value: number;
  color: string;
}

function ScoreItem({ label, value, color }: ScoreItemProps) {
  return (
    <View style={styles.scoreItem}>
      <Text variant="labelSmall" style={styles.scoreLabel}>
        {label}
      </Text>
      <View style={styles.scoreBar}>
        <View style={[styles.scoreBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text variant="labelMedium" style={[styles.scoreValue, { color }]}>
        {value}
      </Text>
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
  overallSection: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 20,
  },
  overallScore: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overallLabel: {
    color: '#6B7280',
    fontWeight: '600',
  },
  detailsSection: {
    gap: 16,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    width: 90,
    color: '#6B7280',
    fontWeight: '600',
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    width: 40,
    textAlign: 'right',
    fontWeight: '600',
  },
});
