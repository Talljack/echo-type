import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface TranscriptDisplayProps {
  expectedText: string;
  recognizedText: string;
  showComparison?: boolean;
}

export function TranscriptDisplay({ expectedText, recognizedText, showComparison = false }: TranscriptDisplayProps) {
  return (
    <View style={styles.container}>
      {/* Expected Text */}
      <View style={styles.section}>
        <Text variant="labelSmall" style={styles.sectionLabel}>
          Expected
        </Text>
        <Text variant="bodyLarge" style={styles.expectedText}>
          {expectedText}
        </Text>
      </View>

      {/* Recognized Text */}
      {recognizedText && (
        <View style={styles.section}>
          <Text variant="labelSmall" style={styles.sectionLabel}>
            You Said
          </Text>
          <Text variant="bodyLarge" style={styles.recognizedText}>
            {recognizedText || 'Listening...'}
          </Text>
        </View>
      )}

      {/* Word-by-word comparison */}
      {showComparison && recognizedText && (
        <View style={styles.section}>
          <Text variant="labelSmall" style={styles.sectionLabel}>
            Comparison
          </Text>
          <View style={styles.comparisonContainer}>
            {expectedText.split(/\s+/).map((word, index) => {
              const recognizedWords = recognizedText.toLowerCase().split(/\s+/);
              const isMatch = recognizedWords.includes(word.toLowerCase());
              return (
                <View
                  key={`${word}-${index}`}
                  style={[styles.wordChip, isMatch ? styles.wordMatch : styles.wordMismatch]}
                >
                  <Text
                    variant="bodySmall"
                    style={[styles.wordText, isMatch ? styles.wordMatchText : styles.wordMismatchText]}
                  >
                    {word}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  expectedText: {
    color: '#374151',
    lineHeight: 28,
  },
  recognizedText: {
    color: '#6366F1',
    lineHeight: 28,
    fontWeight: '500',
  },
  comparisonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wordMatch: {
    backgroundColor: '#D1FAE5',
  },
  wordMismatch: {
    backgroundColor: '#FEE2E2',
  },
  wordText: {
    fontWeight: '500',
  },
  wordMatchText: {
    color: '#065F46',
  },
  wordMismatchText: {
    color: '#991B1B',
  },
});
