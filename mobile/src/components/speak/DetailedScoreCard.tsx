import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { PronunciationResult } from '@/services/pronunciation-api';

interface DetailedScoreCardProps {
  result: PronunciationResult;
}

export function DetailedScoreCard({ result }: DetailedScoreCardProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#F59E0B'; // yellow
    return '#EF4444'; // red
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
          <Text variant="labelLarge" style={styles.overallLabel}>
            {getScoreLabel(result.overallScore)}
          </Text>
        </View>

        {/* Detailed Scores */}
        <View style={styles.detailsContainer}>
          <ScoreBar label="Accuracy" score={result.overallScore} color={getScoreColor(result.overallScore)} />
          <ScoreBar label="Fluency" score={result.fluencyScore} color={getScoreColor(result.fluencyScore)} />
          <ScoreBar
            label="Completeness"
            score={result.completenessScore}
            color={getScoreColor(result.completenessScore)}
          />
        </View>

        {/* Provider Badge */}
        <Text variant="labelSmall" style={styles.provider}>
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
}

function ScoreBar({ label, score, color }: ScoreBarProps) {
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text variant="bodyMedium" style={styles.scoreBarLabel}>
          {label}
        </Text>
        <Text variant="bodyMedium" style={[styles.scoreBarValue, { color }]}>
          {score}
        </Text>
      </View>
      <View style={styles.scoreBarTrack}>
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
    color: '#6B7280',
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
  scoreBarLabel: {
    color: '#374151',
  },
  scoreBarValue: {
    fontWeight: '600',
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  provider: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 16,
  },
});
