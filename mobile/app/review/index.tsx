import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Text } from 'react-native-paper';
import { ContentReviewCard } from '@/components/review/ContentReviewCard';
import { ReviewCard as ReviewCardComponent } from '@/components/review/ReviewCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { FSRSCardData, Rating } from '@/lib/fsrs';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useReviewStore } from '@/stores/useReviewStore';
import type { Content } from '@/types/content';

type ReviewFilter = 'all' | 'vocabulary' | 'content';

type VocabQueueCard = {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  fsrsData: FSRSCardData;
};

type UnifiedReviewItem =
  | { kind: 'vocabulary'; due: number; card: VocabQueueCard }
  | { kind: 'content'; due: number; content: Content };

export default function ReviewScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabularyColors = getModuleColors('vocabulary');
  const listenColors = getModuleColors('listen');

  const contents = useLibraryStore((s) => s.contents);
  const gradeContent = useLibraryStore((s) => s.gradeContent);

  const reviewCards = useReviewStore((s) => s.cards);
  const { reviewCardById, addSampleCards, todayReviewCount, incrementReviewCount, getCardCount } = useReviewStore();

  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [sessionRated, setSessionRated] = useState(0);

  const dueVocab = useMemo(() => {
    const now = Date.now();
    return reviewCards.filter((c) => c.fsrsData.due <= now);
  }, [reviewCards]);

  const dueContents = useMemo(() => {
    const now = Date.now();
    return contents.filter((c) => {
      if (!c.fsrsCard?.due) return false;
      return c.fsrsCard.due <= now;
    });
  }, [contents]);

  const unifiedQueue = useMemo((): UnifiedReviewItem[] => {
    const v: UnifiedReviewItem[] = dueVocab.map((card) => ({
      kind: 'vocabulary',
      due: card.fsrsData.due,
      card,
    }));
    const c: UnifiedReviewItem[] = dueContents.map((content) => ({
      kind: 'content',
      due: content.fsrsCard!.due,
      content,
    }));
    return [...v, ...c].sort((a, b) => a.due - b.due);
  }, [dueVocab, dueContents]);

  const filteredQueue = useMemo(() => {
    if (filter === 'all') return unifiedQueue;
    if (filter === 'vocabulary') return unifiedQueue.filter((i) => i.kind === 'vocabulary');
    return unifiedQueue.filter((i) => i.kind === 'content');
  }, [unifiedQueue, filter]);

  const current = filteredQueue[0];
  const vocabCounts = getCardCount();

  const totalDueAll = dueVocab.length + dueContents.length;

  const sessionProgressDenominator = sessionRated + filteredQueue.length;
  const sessionProgress = sessionProgressDenominator > 0 ? Math.min(1, sessionRated / sessionProgressDenominator) : 0;

  const handleRate = (rating: Rating) => {
    if (!current) return;
    if (current.kind === 'vocabulary') {
      reviewCardById(current.card.id, rating);
    } else {
      gradeContent(current.content.id, rating);
      incrementReviewCount();
    }
    setSessionRated((n) => n + 1);
  };

  const resetSessionProgress = (next: ReviewFilter) => {
    setFilter(next);
    setSessionRated(0);
  };

  const renderBody = () => {
    if (current) {
      return current.kind === 'vocabulary' ? (
        <ReviewCardComponent key={current.card.id} card={current.card} onRate={handleRate} />
      ) : (
        <ContentReviewCard key={current.content.id} content={current.content} onRate={handleRate} />
      );
    }

    const hasVocabDeck = reviewCards.length > 0;
    const hasLibrary = contents.length > 0;
    const globallyCaughtUp = dueVocab.length === 0 && dueContents.length === 0;

    if (!hasVocabDeck && !hasLibrary) {
      return (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            Nothing to review yet
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Add vocabulary cards or open the Library to seed practice content. FSRS will schedule items here when they
            are due.
          </Text>
          <Button
            mode="contained"
            onPress={addSampleCards}
            style={{ marginBottom: 12 }}
            buttonColor={vocabularyColors.primary}
            textColor={colors.onPrimary}
          >
            Load demo vocabulary
          </Button>
          <Button mode="outlined" onPress={() => router.push('/(tabs)/library')} textColor={listenColors.primary}>
            Go to Library
          </Button>
        </View>
      );
    }

    if (globallyCaughtUp) {
      return (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            All caught up
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            No vocabulary or library content is due right now. Come back later or practice from the Library to move
            schedules forward.
          </Text>
          <Text variant="bodySmall" style={[styles.emptySubtext, { color: colors.onSurfaceSecondary }]}>
            You completed {todayReviewCount} rating{todayReviewCount === 1 ? '' : 's'} today
          </Text>
        </View>
      );
    }

    if (filter === 'vocabulary') {
      return (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No vocabulary due
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Try All or Content, or check back when your word cards are due.
          </Text>
        </View>
      );
    }

    if (filter === 'content') {
      return (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No library content due
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Practice items in Listen, Read, or Write to schedule reviews, or switch to All / Vocabulary.
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Review" titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>

      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Due total
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.error }]}>
              {totalDueAll}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Words
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: vocabularyColors.primary }]}>
              {dueVocab.length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Content
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: listenColors.primary }]}>
              {dueContents.length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Today
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.success }]}>
              {todayReviewCount}
            </Text>
          </View>
        </View>
        <Text variant="labelSmall" style={[styles.subStats, { color: colors.onSurfaceSecondary }]}>
          Deck: {vocabCounts.new} new · {vocabCounts.learning} learning · {vocabCounts.review} review
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <View
            style={[styles.progressFill, { width: `${sessionProgress * 100}%`, backgroundColor: colors.primary }]}
          />
        </View>
        <Text variant="labelSmall" style={[styles.progressCaption, { color: colors.onSurfaceVariant }]}>
          This session: {sessionRated} done · {filteredQueue.length} left
        </Text>
      </View>

      <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
        <SegmentedButtons
          value={filter}
          onValueChange={(v) => resetSessionProgress(v as ReviewFilter)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'vocabulary', label: 'Words' },
            { value: 'content', label: 'Content' },
          ]}
          style={styles.segmented}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '600',
  },
  statsBar: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  subStats: {
    textAlign: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressCaption: {
    textAlign: 'center',
  },
  segmentWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmented: {
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 280,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  emptySubtext: {
    textAlign: 'center',
  },
});
