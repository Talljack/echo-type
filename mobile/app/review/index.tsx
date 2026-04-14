import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import { ReviewCard as ReviewCardComponent } from '@/components/review/ReviewCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { Rating } from '@/lib/fsrs';
import { useReviewStore } from '@/stores/useReviewStore';

export default function ReviewScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabularyColors = getModuleColors('vocabulary');
  const { getDueCards, getCardCount, reviewCardById, addSampleCards, todayReviewCount, cards } = useReviewStore();

  const dueCards = getDueCards();
  const counts = getCardCount();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentCard = dueCards[currentIndex];

  const handleRate = (rating: Rating) => {
    if (!currentCard) return;
    reviewCardById(currentCard.id, rating);

    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Review" titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>

      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Due
          </Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: '#FF3B30' }]}>
            {counts.due}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            New
          </Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: vocabularyColors.primary }]}>
            {counts.new}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Learning
          </Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: '#FF9500' }]}>
            {counts.learning}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Today
          </Text>
          <Text variant="titleMedium" style={[styles.statValue, { color: '#34C759' }]}>
            {todayReviewCount}
          </Text>
        </View>
      </View>

      {cards.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No Cards Yet
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Review works locally, but vocabulary collection is not connected yet.
          </Text>
          <Button
            mode="outlined"
            onPress={addSampleCards}
            style={styles.sampleButton}
            buttonColor={vocabularyColors.primary}
            textColor="#FFFFFF"
          >
            Load Demo Cards
          </Button>
        </View>
      ) : currentCard ? (
        <ReviewCardComponent card={currentCard} onRate={handleRate} />
      ) : (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            All Caught Up!
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No cards due for review right now. Come back later!
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            You reviewed {todayReviewCount} cards today
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
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
    marginBottom: 24,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#9CA3AF',
  },
  sampleButton: {
    backgroundColor: '#6366F1',
  },
});
