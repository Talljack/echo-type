import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { DetailedScoreCard } from '@/components/speak/DetailedScoreCard';
import { PronunciationTips } from '@/components/speak/PronunciationTips';
import { RecordButton } from '@/components/speak/RecordButton';
import { TranscriptDisplay } from '@/components/speak/TranscriptDisplay';
import { VoiceRecognition } from '@/lib/voice';
import {
  assessPronunciation,
  calculateSimplePronunciationScore,
  type PronunciationResult,
} from '@/services/pronunciation-api';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';

export default function SpeakPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const { startSession, endSession, setIsRecording, setRecognizedText, isRecording, recognizedText } = useSpeakStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

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
    }
  };

  const handleTryAgain = () => {
    setRecognizedText('');
    setResult(null);
    setRecordingUri(null);
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

        {/* Transcript Display */}
        <TranscriptDisplay expectedText={content.text} recognizedText={recognizedText} showComparison={!!result} />

        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text variant="bodyMedium" style={styles.analyzingText}>
              Analyzing pronunciation...
            </Text>
          </View>
        )}

        {/* Score Card */}
        {result && <DetailedScoreCard result={result} />}

        {/* Pronunciation Tips */}
        {result && <PronunciationTips result={result} />}

        {/* Record Button */}
        <RecordButton isRecording={isRecording} onPress={handleRecordPress} disabled={isAnalyzing} />

        {/* Actions */}
        <View style={styles.actions}>
          {result && (
            <Button mode="outlined" onPress={handleTryAgain} style={styles.actionButton}>
              Try Again
            </Button>
          )}
          <Button mode="contained" onPress={() => router.back()} style={styles.actionButton}>
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
  analyzingContainer: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  analyzingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  actions: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
