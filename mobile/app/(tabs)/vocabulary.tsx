import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, FAB, IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { AddVocabularyModal } from '@/components/vocabulary/AddVocabularyModal';
import { useReviewStore } from '@/stores/useReviewStore';

export default function VocabularyScreen() {
  const { cards, removeCard, getCardCount } = useReviewStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const stats = getCardCount();

  const handleDelete = (id: string) => {
    removeCard(id);
  };

  const handleReview = () => {
    router.push('/review');
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Vocabulary
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text variant="headlineSmall" style={styles.statNumber}>
              {stats.total}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineSmall" style={[styles.statNumber, styles.dueNumber]}>
              {stats.due}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Due
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineSmall" style={styles.statNumber}>
              {stats.new}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              New
            </Text>
          </View>
        </View>

        {/* Review Button */}
        {stats.due > 0 && (
          <Button mode="contained" onPress={handleReview} style={styles.reviewButton}>
            Review {stats.due} Cards
          </Button>
        )}

        {/* Vocabulary List */}
        {cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Vocabulary Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Add words while practicing or tap the + button to add manually
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text variant="titleLarge" style={styles.word}>
                      {item.word}
                    </Text>
                    <IconButton icon="delete" size={20} onPress={() => handleDelete(item.id)} />
                  </View>
                  <Text variant="bodyMedium" style={styles.meaning}>
                    {item.meaning}
                  </Text>
                  {item.example && (
                    <Text variant="bodySmall" style={styles.example}>
                      "{item.example}"
                    </Text>
                  )}
                  <Text variant="labelSmall" style={styles.nextReview}>
                    Next review: {new Date(item.fsrsData.due).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add FAB */}
        <FAB icon="plus" style={styles.fab} onPress={() => setAddModalVisible(true)} />

        {/* Add Modal */}
        <AddVocabularyModal visible={addModalVisible} selectedWord="" onDismiss={() => setAddModalVisible(false)} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dueNumber: {
    color: '#EF4444',
  },
  statLabel: {
    color: '#6B7280',
    marginTop: 4,
  },
  reviewButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  word: {
    fontWeight: 'bold',
    flex: 1,
  },
  meaning: {
    color: '#374151',
    marginBottom: 8,
  },
  example: {
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  nextReview: {
    color: '#6366F1',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
  },
});
