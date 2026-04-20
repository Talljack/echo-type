import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ReadableTextProps {
  text: string;
  onTextSelect?: (selectedText: string) => void;
}

export function ReadableText({ text, onTextSelect }: ReadableTextProps) {
  const { colors } = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.content}>
      <Text variant="bodyLarge" style={[styles.text, { color: colors.onSurface }]} selectable onTextLayout={() => {}}>
        {text}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  content: {
    padding: 20,
  },
  text: {
    lineHeight: 32,
    fontSize: 18,
  },
});
