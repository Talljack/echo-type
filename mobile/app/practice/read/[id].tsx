import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { RatingButtons } from '@/components/practice/RatingButtons';
import { ReadableText } from '@/components/read/ReadableText';
import { TranslationPanel } from '@/components/read/TranslationPanel';
import { AddVocabularyModal } from '@/components/vocabulary/AddVocabularyModal';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useReadStore } from '@/stores/useReadStore';

export default function ReadPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, selectedText, setSelectedText, showTranslation, setShowTranslation } =
    useReadStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);
  const [showVocabModal, setShowVocabModal] = useState(false);

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
  };

  const handleCloseTranslation = () => {
    setShowTranslation(false);
    setSelectedText('');
  };

  const handleAddToVocabulary = (word: string, meaning: string, example?: string) => {
    setShowVocabModal(true);
  };

  const handleFinishReading = () => {
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
            {content.difficulty} • {content.language} • {content.text.split(/\s+/).length} words
          </Text>
        </View>

        {/* Translation Panel */}
        {showTranslation && selectedText && (
          <TranslationPanel
            selectedText={selectedText}
            targetLang={content.language === 'zh' ? 'en' : 'zh'}
            context={content.text}
            onClose={handleCloseTranslation}
            onAddToVocabulary={handleAddToVocabulary}
          />
        )}

        {/* Readable Text */}
        <ReadableText text={content.text} onTextSelect={handleTextSelect} />

        {/* FSRS Rating Buttons */}
        {showRating && ratingIntervals && <RatingButtons onRate={handleRate} intervals={ratingIntervals} />}

        {/* Actions */}
        <View style={styles.actions}>
          {!showRating ? (
            <Button mode="contained" onPress={handleFinishReading}>
              Finish Reading
            </Button>
          ) : (
            <Button mode="outlined" onPress={() => router.back()}>
              Skip Rating
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Add Vocabulary Modal */}
      <AddVocabularyModal
        visible={showVocabModal}
        selectedWord={selectedText}
        context={content.text}
        onDismiss={() => setShowVocabModal(false)}
      />
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
