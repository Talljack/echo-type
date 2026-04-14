import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useListenStore } from '@/stores/useListenStore';

export default function ListenScreen() {
  const getTotalListenTime = useListenStore((state) => state.getTotalListenTime);

  const totalMinutes = Math.floor(getTotalListenTime() / 60);

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Listen
          </Text>
          <View style={styles.stats}>
            <Text variant="bodySmall" style={styles.statsText}>
              Total: {totalMinutes} minutes
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <MvpNoticeCard
            title="Listen from your library"
            body="Choose a saved text from Library to start listening practice. Recent session stats stay here."
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
