import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { CloudAudioPlayer } from '@/components/listen/CloudAudioPlayer';
import { HighlightedText } from '@/components/listen/HighlightedText';
import { RatingButtons } from '@/components/practice/RatingButtons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { previewRatings, type Rating } from '@/lib/fsrs';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';

export default function ListenPracticeScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text variant="headlineSmall" style={{ color: colors.onSurface }}>
            Content not found
          </Text>
          <Button mode="contained" onPress={() => router.back()} buttonColor={listenColors.primary}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient colors={listenColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color="#FFFFFF" />
          <Appbar.Content title={content.title} titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.headerInfo}>
          <Text variant="bodyMedium" style={styles.headerMeta}>
            {content.difficulty} • {content.language}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Audio Player */}
        <CloudAudioPlayer text={content.text} voice={defaultVoice} onWordChange={setCurrentWordIndex} />

        {/* Highlighted Text */}
        <HighlightedText text={content.text} currentWordIndex={currentWordIndex} />

        {/* FSRS Rating Buttons */}
        {showRating && ratingIntervals && <RatingButtons onRate={handleRate} intervals={ratingIntervals} />}

        {/* Actions */}
        <View style={styles.actions}>
          {!showRating ? (
            <Button
              mode="contained"
              onPress={handleFinishListening}
              buttonColor={listenColors.primary}
              style={styles.actionButton}
            >
              Finish Listening
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={() => router.back()}
              textColor={listenColors.primary}
              style={styles.actionButton}
            >
              Skip Rating
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 16,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerInfo: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerMeta: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
  },
});
