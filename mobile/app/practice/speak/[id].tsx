import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { RecordButton } from '@/components/speak/RecordButton';
import { ScoreCard } from '@/components/speak/ScoreCard';
import { TranscriptDisplay } from '@/components/speak/TranscriptDisplay';
import { calculatePronunciationScore, type PronunciationScore, VoiceRecognition } from '@/lib/voice';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';

export default function SpeakPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const { startSession, endSession, setIsRecording, setRecognizedText, isRecording, recognizedText } = useSpeakStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [score, setScore] = useState<PronunciationScore | null>(null);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      VoiceRecognition.destroy();
      if (startTime && score) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        endSession(score.overall, duration);
      }
    };
  }, []);

  const handleRecordPress = async () => {
    if (isRecording) {
      await VoiceRecognition.stop();
      setIsRecording(false);
    } else {
      setRecognizedText('');
      setScore(null);
      setIsRecording(true);

      await VoiceRecognition.start({
        language: content?.language === 'zh' ? 'zh-CN' : 'en-US',
        onStart: () => {
          setIsRecording(true);
        },
        onResult: (text) => {
          setRecognizedText(text);
        },
        onEnd: () => {
          setIsRecording(false);
          if (content && recognizedText) {
            const calculatedScore = calculatePronunciationScore(content.text, recognizedText);
            setScore(calculatedScore);
          }
        },
        onError: (error) => {
          setIsRecording(false);
          console.error('Voice recognition error:', error);
        },
      });
    }
  };

  const handleTryAgain = () => {
    setRecognizedText('');
    setScore(null);
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
        <TranscriptDisplay expectedText={content.text} recognizedText={recognizedText} showComparison={!!score} />

        {/* Score Card */}
        {score && <ScoreCard score={score} />}

        {/* Record Button */}
        <RecordButton isRecording={isRecording} onPress={handleRecordPress} />

        {/* Actions */}
        <View style={styles.actions}>
          {score && (
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
  actions: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
