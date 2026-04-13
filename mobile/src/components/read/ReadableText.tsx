import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ReadableTextProps {
  text: string;
  onTextSelect?: (selectedText: string) => void;
}

export function ReadableText({ text, onTextSelect }: ReadableTextProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="bodyLarge" style={styles.text} selectable onTextLayout={() => {}}>
        {text}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
  },
  content: {
    padding: 20,
  },
  text: {
    lineHeight: 32,
    color: '#374151',
    fontSize: 18,
  },
});
