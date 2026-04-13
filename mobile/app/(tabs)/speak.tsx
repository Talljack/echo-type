import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';

export default function SpeakScreen() {
  const contents = useLibraryStore((state) => state.contents);
  const getTotalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime);
  const getAverageScore = useSpeakStore((state) => state.getAverageScore);

  const totalMinutes = Math.floor(getTotalSpeakTime() / 60);
  const averageScore = getAverageScore();

  const handleContentPress = (contentId: string) => {
    router.push(`/practice/speak/${contentId}`);
  };

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

        {/* Content list */}
        {contents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Content Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Go to Library to import content for speaking practice
            </Text>
          </View>
        ) : (
          <FlatList
            data={contents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ContentCard content={item} onPress={() => handleContentPress(item.id)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  list: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
  },
});
