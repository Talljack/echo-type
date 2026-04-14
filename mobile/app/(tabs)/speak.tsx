import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useSpeakStore } from '@/stores/useSpeakStore';

export default function SpeakScreen() {
  const getTotalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime);
  const getAverageScore = useSpeakStore((state) => state.getAverageScore);

  const totalMinutes = Math.floor(getTotalSpeakTime() / 60);
  const averageScore = getAverageScore();

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Speak
          </Text>
          <View style={styles.stats}>
            <Text variant="bodySmall" style={styles.statsText}>
              Total: {totalMinutes} minutes
            </Text>
            <Text variant="bodySmall" style={styles.statsText}>
              Avg Score: {averageScore}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <MvpNoticeCard
            title="Speak from your library"
            body="Choose a saved text from Library to start speaking practice. Recent score summaries stay here."
          />

          <Button mode="contained" onPress={() => router.push('/(tabs)/library')} style={styles.button}>
            Choose from Library
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statsText: {
    color: '#6B7280',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  button: {
    marginTop: 8,
  },
});
