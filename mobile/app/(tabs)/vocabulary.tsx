import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, FAB, IconButton, Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Screen } from '@/components/layout/Screen';
import { AddVocabularyModal } from '@/components/vocabulary/AddVocabularyModal';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useReviewStore } from '@/stores/useReviewStore';

export default function VocabularyScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabularyColors = getModuleColors('vocabulary');
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: colors.onSurface }]}>
            Vocabulary
          </Text>
        </View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="book-alphabet" size={24} color={vocabularyColors.primary} />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: colors.onSurface }]}>
              {stats.total}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Total Words
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={24} color="#FF3B30" />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: '#FF3B30' }]}>
              {stats.due}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Due Today
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="star-outline" size={24} color="#34C759" />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: colors.onSurface }]}>
              {stats.new}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              New
            </Text>
          </View>
        </Animated.View>

        {/* Review Button */}
        {stats.due > 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.reviewButtonContainer}>
            <Button
              mode="contained"
              onPress={handleReview}
              style={[styles.reviewButton, { backgroundColor: vocabularyColors.primary }]}
              contentStyle={styles.reviewButtonContent}
              labelStyle={styles.reviewButtonLabel}
            >
              Review {stats.due} Card{stats.due > 1 ? 's' : ''}
            </Button>
          </Animated.View>
        )}

        {/* Vocabulary List */}
        {cards.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={80} color={colors.onSurfaceVariant} />
            <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No Vocabulary Yet
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Add words while practicing or tap the + button to add manually
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInRight.delay(index * 50)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: colors.surface },
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text variant="titleLarge" style={[styles.word, { color: colors.onSurface }]}>
                        {item.word}
                      </Text>
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        onPress={() => handleDelete(item.id)}
                        iconColor={colors.error}
                      />
                    </View>
                    <Text variant="bodyMedium" style={[styles.meaning, { color: colors.onSurfaceVariant }]}>
                      {item.meaning}
                    </Text>
                    {item.example && (
                      <View style={[styles.exampleContainer, { backgroundColor: colors.surfaceVariant }]}>
                        <MaterialCommunityIcons name="format-quote-open" size={16} color={colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={[styles.example, { color: colors.onSurfaceVariant }]}>
                          {item.example}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardFooter}>
                      <View style={[styles.nextReviewBadge, { backgroundColor: '#6366F120' }]}>
                        <MaterialCommunityIcons name="calendar-clock" size={14} color="#6366F1" />
                        <Text variant="labelSmall" style={styles.nextReview}>
                          {new Date(item.fsrsData.due).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setAddModalVisible(true)}
          color="#FFFFFF"
        />

        {/* Add Modal */}
        <AddVocabularyModal visible={addModalVisible} selectedWord="" onDismiss={() => setAddModalVisible(false)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 0.4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  dueNumber: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
  },
  reviewButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reviewButton: {
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewButtonContent: {
    paddingVertical: 8,
  },
  reviewButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  word: {
    fontWeight: '700',
    flex: 1,
  },
  meaning: {
    marginBottom: 12,
    lineHeight: 22,
  },
  exampleContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  example: {
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  nextReview: {
    color: '#6366F1',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
  },
});
