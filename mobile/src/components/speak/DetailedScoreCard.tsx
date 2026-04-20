import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { PronunciationResult } from '@/services/pronunciation-api';

interface DetailedScoreCardProps {
  result: PronunciationResult;
}

export function DetailedScoreCard({ result }: DetailedScoreCardProps) {
  const { colors } = useAppTheme();
  const scoreTrackColor = colors.surfaceVariant;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    return colors.error;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Practice';
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        {/* Overall Score */}
        <View style={styles.overallContainer}>
          <Text variant="headlineLarge" style={[styles.overallScore, { color: getScoreColor(result.overallScore) }]}>
            {result.overallScore}
          </Text>
          <Text variant="labelLarge" style={[styles.overallLabel, { color: colors.onSurfaceSecondary }]}>
            {getScoreLabel(result.overallScore)}
          </Text>
        </View>

        {/* Detailed Scores */}
        <View style={styles.detailsContainer}>
          <ScoreBar
            label="Accuracy"
            score={result.overallScore}
            color={getScoreColor(result.overallScore)}
            trackColor={scoreTrackColor}
            labelColor={colors.onSurface}
          />
          <ScoreBar
            label="Fluency"
            score={result.fluencyScore}
            color={getScoreColor(result.fluencyScore)}
            trackColor={scoreTrackColor}
            labelColor={colors.onSurface}
          />
          <ScoreBar
            label="Completeness"
            score={result.completenessScore}
            color={getScoreColor(result.completenessScore)}
            trackColor={scoreTrackColor}
            labelColor={colors.onSurface}
          />
        </View>

        {/* Provider Badge */}
        <Text variant="labelSmall" style={[styles.provider, { color: colors.onSurfaceSecondary }]}>
          {result.provider === 'speechsuper' ? 'AI-Powered Analysis' : 'Basic Analysis'}
        </Text>
      </Card.Content>
    </Card>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  color: string;
  trackColor: string;
  labelColor: string;
}

function ScoreBar({ label, score, color, trackColor, labelColor }: ScoreBarProps) {
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text variant="bodyMedium" style={{ color: labelColor }}>
          {label}
        </Text>
        <Text variant="bodyMedium" style={[styles.scoreBarValue, { color }]}>
          {score}
        </Text>
      </View>
      <View style={[styles.scoreBarTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  overallContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overallScore: {
    fontWeight: 'bold',
    fontSize: 64,
  },
  overallLabel: {
    marginTop: 4,
  },
  detailsContainer: {
    gap: 16,
  },
  scoreBarContainer: {
    gap: 4,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBarValue: {
    fontWeight: '600',
  },
  scoreBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  provider: {
    textAlign: 'center',
    marginTop: 16,
  },
});
