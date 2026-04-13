import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { TypingInput } from '@/components/write/TypingInput';
import { TypingStats } from '@/components/write/TypingStats';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useWriteStore } from '@/stores/useWriteStore';

export default function WritePracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.getContent(id));
  const { startSession, endSession, currentInput, setCurrentInput, incrementErrors, errors } = useWriteStore();

  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (content) {
      startSession(content.id);
      setStartTime(Date.now());
    }

    return () => {
      if (startTime && content && !isComplete) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const wpm = calculateWPM();
        const accuracy = calculateAccuracy();
        endSession(accuracy, wpm, duration);
      }
    };
  }, []);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (content && currentInput.length === content.text.length) {
      setIsComplete(true);
      const duration = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
      const wpm = calculateWPM();
      const accuracy = calculateAccuracy();
      endSession(accuracy, wpm, duration);
    }
  }, [currentInput]);

  const calculateWPM = () => {
    if (!startTime || timeElapsed === 0) return 0;
    const words = currentInput.split(/\s+/).length;
    const minutes = timeElapsed / 60;
    return Math.round(words / minutes);
  };

  const calculateAccuracy = () => {
    if (!content || currentInput.length === 0) return 100;
    const totalChars = currentInput.length;
    const correctChars = totalChars - errors;
    return Math.round((correctChars / totalChars) * 100);
  };

  const handleInputChange = (text: string) => {
    setCurrentInput(text);
  };

  const handleError = () => {
    incrementErrors();
  };

  const handleTryAgain = () => {
    if (content) {
      setCurrentInput('');
      setStartTime(Date.now());
      setTimeElapsed(0);
      setIsComplete(false);
      startSession(content.id);
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

        {/* Stats */}
        <TypingStats wpm={calculateWPM()} accuracy={calculateAccuracy()} timeElapsed={timeElapsed} />

        {/* Typing Input */}
        <TypingInput
          expectedText={content.text}
          currentInput={currentInput}
          onInputChange={handleInputChange}
          onError={handleError}
        />

        {/* Completion Message */}
        {isComplete && (
          <View style={styles.completionCard}>
            <Text variant="headlineSmall" style={styles.completionTitle}>
              🎉 Complete!
            </Text>
            <Text variant="bodyMedium" style={styles.completionText}>
              Great job! You finished typing the text.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isComplete && (
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
  completionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#10B981',
  },
  completionText: {
    textAlign: 'center',
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
