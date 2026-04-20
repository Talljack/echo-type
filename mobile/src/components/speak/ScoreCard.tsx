import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { PronunciationScore } from '@/lib/voice';

interface ScoreCardProps {
  score: PronunciationScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const { colors } = useAppTheme();

  const getScoreColor = (value: number) => {
    if (value >= 80) return colors.success;
    if (value >= 60) return colors.warning;
    return colors.error;
  };

  const getScoreLabel = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    return 'Needs Practice';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Overall Score */}
      <View style={[styles.overallSection, { borderBottomColor: colors.borderLight }]}>
        <Text variant="headlineLarge" style={[styles.overallScore, { color: getScoreColor(score.overall) }]}>
          {score.overall}
        </Text>
        <Text variant="labelLarge" style={[styles.overallLabel, { color: colors.onSurfaceSecondary }]}>
          {getScoreLabel(score.overall)}
        </Text>
      </View>

      {/* Detailed Scores */}
      <View style={styles.detailsSection}>
        <ScoreItem
          label="Accuracy"
          value={score.accuracy}
          color={getScoreColor(score.accuracy)}
          labelColor={colors.onSurfaceSecondary}
          trackColor={colors.surfaceVariant}
        />
        <ScoreItem
          label="Fluency"
          value={score.fluency}
          color={getScoreColor(score.fluency)}
          labelColor={colors.onSurfaceSecondary}
          trackColor={colors.surfaceVariant}
        />
        <ScoreItem
          label="Completeness"
          value={score.completeness}
          color={getScoreColor(score.completeness)}
          labelColor={colors.onSurfaceSecondary}
          trackColor={colors.surfaceVariant}
        />
      </View>
    </View>
  );
}

interface ScoreItemProps {
  label: string;
  value: number;
  color: string;
  labelColor: string;
  trackColor: string;
}

function ScoreItem({ label, value, color, labelColor, trackColor }: ScoreItemProps) {
  return (
    <View style={styles.scoreItem}>
      <Text variant="labelSmall" style={[styles.scoreLabel, { color: labelColor }]}>
        {label}
      </Text>
      <View style={[styles.scoreBar, { backgroundColor: trackColor }]}>
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
    marginBottom: 20,
  },
  overallScore: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overallLabel: {
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
    fontWeight: '600',
  },
  scoreBar: {
    flex: 1,
    height: 8,
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
