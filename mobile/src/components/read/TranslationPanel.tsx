import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

interface TranslationPanelProps {
  selectedText: string;
  translation: string;
  onClose: () => void;
}

export function TranslationPanel({ selectedText, translation, onClose }: TranslationPanelProps) {
  if (!selectedText) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={styles.headerText}>
          Translation unavailable
        </Text>
        <IconButton icon="close" size={20} onPress={onClose} />
      </View>

      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.originalText}>
          {selectedText}
        </Text>
        <View style={styles.divider} />
        <Text variant="bodyLarge" style={styles.translationText}>
          Translation is not connected in the mobile MVP yet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  originalText: {
    color: '#6B7280',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  translationText: {
    color: '#374151',
    fontWeight: '500',
  },
});
