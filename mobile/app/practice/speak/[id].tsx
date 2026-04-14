import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { RatingButtons } from '@/components/practice/RatingButtons';
import { DetailedScoreCard } from '@/components/speak/DetailedScoreCard';
import { PronunciationTips } from '@/components/speak/PronunciationTips';
import { RecordButton } from '@/components/speak/RecordButton';
import { TranscriptDisplay } from '@/components/speak/TranscriptDisplay';
import { useAppTheme } from '@/contexts/ThemeContext';
import { accuracyToRating, previewRatings, type Rating } from '@/lib/fsrs';
import { VoiceRecognition } from '@/lib/voice';
import {
  assessPronunciation,
  calculateSimplePronunciationScore,
  type PronunciationResult,
} from '@/services/pronunciation-api';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';

export default function SpeakPracticeScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const gradeContent = useLibraryStore((state) => state.gradeContent);
  const { startSession, endSession, setIsRecording, setRecognizedText, isRecording, recognizedText } = useSpeakStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingIntervals, setRatingIntervals] = useState<any>(null);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      VoiceRecognition.destroy();
      if (startTime && result) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        endSession(result.overallScore, duration);
      }
    };
  }, []);

  const handleRecordPress = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);

      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordingUri(uri);

        // Analyze pronunciation
        if (uri && content) {
          await analyzePronunciation(uri, content.text);
        }
      }
    } else {
      // Start recording
      setRecognizedText('');
      setResult(null);
      setRecordingUri(null);

      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );

        setRecording(newRecording);
        setIsRecording(true);

        // Also start voice recognition for transcript
        await VoiceRecognition.start({
          language: content?.language === 'zh' ? 'zh-CN' : 'en-US',
          onResult: (text) => {
            setRecognizedText(text);
          },
          onError: (error) => {
            console.error('Voice recognition error:', error);
          },
        });
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
      }
    }
  };

  const analyzePronunciation = async (audioUri: string, referenceText: string) => {
    setIsAnalyzing(true);

    try {
      // Try to use SpeechSuper API if credentials are available
      const appKey = process.env.EXPO_PUBLIC_SPEECHSUPER_APP_KEY;
      const secretKey = process.env.EXPO_PUBLIC_SPEECHSUPER_SECRET_KEY;

      let pronunciationResult: PronunciationResult;

      if (appKey && secretKey) {
        pronunciationResult = await assessPronunciation(audioUri, referenceText, appKey, secretKey);
      } else {
        // Fallback to simple word-based scoring
        pronunciationResult = calculateSimplePronunciationScore(referenceText, recognizedText);
      }

      setResult(pronunciationResult);
    } catch (error) {
      console.error('Pronunciation analysis failed:', error);
      // Fallback to simple scoring
      const fallbackResult = calculateSimplePronunciationScore(referenceText, recognizedText);
      setResult(fallbackResult);
    } finally {
      setIsAnalyzing(false);
      // Show rating buttons after analysis
      if (content) {
        const intervals = previewRatings(content.fsrsCard);
        setRatingIntervals(intervals);
        setShowRating(true);
      }
    }
  };

  const handleTryAgain = () => {
    setRecognizedText('');
    setResult(null);
    setRecordingUri(null);
    setShowRating(false);
    setRatingIntervals(null);
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
          <Button mode="contained" onPress={() => router.back()} buttonColor={speakColors.primary}>
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient colors={speakColors.gradient} style={styles.headerGradient}>
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
        {/* Transcript Display */}
        <TranscriptDisplay expectedText={content.text} recognizedText={recognizedText} showComparison={!!result} />

        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <View style={[styles.analyzingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={speakColors.primary} />
            <Text variant="bodyMedium" style={[styles.analyzingText, { color: colors.onSurfaceVariant }]}>
              Analyzing pronunciation...
            </Text>
          </View>
        )}

        {/* Score Card */}
        {result && <DetailedScoreCard result={result} />}

        {/* Pronunciation Tips */}
        {result && <PronunciationTips result={result} />}

        {/* FSRS Rating Buttons */}
        {showRating && ratingIntervals && <RatingButtons onRate={handleRate} intervals={ratingIntervals} />}

        {/* Record Button */}
        <RecordButton isRecording={isRecording} onPress={handleRecordPress} disabled={isAnalyzing} />

        {/* Actions */}
        <View style={styles.actions}>
          {result && (
            <Button
              mode="outlined"
              onPress={handleTryAgain}
              style={styles.actionButton}
              textColor={speakColors.primary}
            >
              Try Again
            </Button>
          )}
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.actionButton}
            buttonColor={speakColors.primary}
          >
            Done
          </Button>
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
    gap: 16,
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
  },
  analyzingText: {
    marginTop: 12,
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
  },
});
