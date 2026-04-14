import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { CloudAudioPlayer } from '@/components/listen/CloudAudioPlayer';
import { HighlightedText } from '@/components/listen/HighlightedText';
import { RatingButtons } from '@/components/practice/RatingButtons';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';

export default function ListenPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, setCurrentWordIndex, currentWordIndex } = useListenStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);

  // Default voice based on language
  const defaultVoice = content?.language === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-JennyNeural';

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

  const handleFinishListening = () => {
    if (content) {
      const intervals = previewRatings(content.fsrsCard);
      setRatingIntervals(intervals);
      setShowRating(true);
    }
  };

  const handleRate = (rating: Rating) => {
    if (content) {
      gradeContent(content.id, rating);
      router.back();
    }
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
            {content.difficulty} • {content.language}
          </Text>
        </View>

        {/* Audio Player */}
        <CloudAudioPlayer text={content.text} voice={defaultVoice} onWordChange={setCurrentWordIndex} />

        {/* Highlighted Text */}
        <HighlightedText text={content.text} currentWordIndex={currentWordIndex} />

        {/* FSRS Rating Buttons */}
        {showRating && ratingIntervals && <RatingButtons onRate={handleRate} intervals={ratingIntervals} />}

        {/* Actions */}
        <View style={styles.actions}>
          {!showRating ? (
            <Button mode="contained" onPress={handleFinishListening}>
              Finish Listening
            </Button>
          ) : (
            <Button mode="outlined" onPress={() => router.back()}>
              Skip Rating
            </Button>
          )}
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
