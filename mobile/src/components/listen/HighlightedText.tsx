import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface HighlightedTextProps {
  text: string;
  currentWordIndex: number;
}

export function HighlightedText({ text, currentWordIndex }: HighlightedTextProps) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  return (
    <View style={styles.container}>
      <Text variant="bodyLarge" style={styles.text}>
        {words.map((word, index) => (
          <Text
            key={`${word}-${index}`}
            style={[
              styles.word,
              index === currentWordIndex && styles.highlighted,
              index < currentWordIndex && styles.read,
            ]}
          >
            {word}{' '}
          </Text>
        ))}
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
  text: {
    lineHeight: 32,
  },
  word: {
    fontSize: 18,
    color: '#374151',
  },
  highlighted: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  read: {
    color: '#9CA3AF',
  },
});
