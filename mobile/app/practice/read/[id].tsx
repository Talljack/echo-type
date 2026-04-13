import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ReadableText } from '@/components/read/ReadableText';
import { TranslationPanel } from '@/components/read/TranslationPanel';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useReadStore } from '@/stores/useReadStore';

export default function ReadPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const { startSession, endSession, selectedText, setSelectedText, showTranslation, setShowTranslation } =
    useReadStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [translation, setTranslation] = useState('');

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime && content) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const wordsRead = content.text.split(/\s+/).length;
        endSession(duration, wordsRead);
      }
    };
  }, []);

  const handleTextSelect = (text: string) => {
    setSelectedText(text);
    setShowTranslation(true);
    // Simulate translation (in real app, call translation API)
    setTranslation(`Translation of: ${text}`);
  };

  const handleCloseTranslation = () => {
    setShowTranslation(false);
    setSelectedText('');
    setTranslation('');
  };

  if (!content) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text variant="headlineSmall">Content not found</Text>
          <Button mode="contained" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {content.title}
          </Text>
          <Text variant="bodySmall" style={styles.meta}>
            {content.difficulty} • {content.language} • {content.text.split(/\s+/).length} words
          </Text>
        </View>

        {/* Translation Panel */}
        {showTranslation && (
          <TranslationPanel selectedText={selectedText} translation={translation} onClose={handleCloseTranslation} />
        )}

        {/* Readable Text */}
        <ReadableText text={content.text} onTextSelect={handleTextSelect} />

        {/* Actions */}
        <View style={styles.actions}>
          <Button mode="contained" onPress={() => router.back()}>
            Done
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  meta: {
    color: '#6B7280',
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
  },
});
