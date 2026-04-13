import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { AudioPlayer } from '@/components/listen/AudioPlayer';
import { HighlightedText } from '@/components/listen/HighlightedText';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';

export default function ListenPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const { startSession, endSession, setCurrentWordIndex, currentWordIndex } = useListenStore();

  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        endSession(duration);
      }
    };
  }, []);

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
            {content.difficulty} • {content.language}
          </Text>
        </View>

        {/* Audio Player */}
        <AudioPlayer
          text={content.text}
          language={content.language === 'zh' ? 'zh-CN' : 'en-US'}
          onWordChange={setCurrentWordIndex}
        />

        {/* Highlighted Text */}
        <HighlightedText text={content.text} currentWordIndex={currentWordIndex} />

        {/* Actions */}
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => router.back()}>
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
