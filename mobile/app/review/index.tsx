import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Text } from 'react-native-paper';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ContentReviewCard } from '@/components/review/ContentReviewCard';
import { ReviewCard as ReviewCardComponent } from '@/components/review/ReviewCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import type { FSRSCardData, Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Content } from '@/types/content';
import type { FavoriteItem } from '@/types/favorite';

type ReviewFilter = 'today' | 'all' | 'favorites' | 'content';

type FavoriteQueueItem = {
  id: string;
  text: string;
  translation: string;
  context?: string;
  fsrsCard?: FSRSCardData;
};

type UnifiedReviewItem =
  | { kind: 'favorites'; due: number; item: FavoriteQueueItem }
  | { kind: 'content'; due: number; content: Content };

function endOfTodayMs(): number {
  return endOfDay(new Date()).getTime();
}

function collectDueTimestamps(favoriteItems: FavoriteItem[], contents: Content[]): number[] {
  const times: number[] = [];
  for (const i of favoriteItems) {
    times.push(i.fsrsCard?.due ?? Date.now());
  }
  for (const c of contents) {
    if (c.fsrsCard?.due) times.push(c.fsrsCard.due);
  }
  return times;
}

function DailyRing({
  progress,
  color,
  trackColor,
  size = 56,
}: {
  progress: number;
  color: string;
  trackColor: string;
  size?: number;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - Math.min(1, Math.max(0, progress)));
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
      />
    </Svg>
  );
}

export default function ReviewScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const { t, tInterpolate } = useI18n();
  const params = useLocalSearchParams<{ filter?: ReviewFilter }>();
  const vocabularyColors = getModuleColors('vocabulary');
  const listenColors = getModuleColors('listen');

  const contents = useLibraryStore((s) => s.contents);
  const gradeContent = useLibraryStore((s) => s.gradeContent);

  const favoriteItems = useFavoriteStore((s) => s.items);
  const { gradeFavorite, addSampleFavorites, todayReviewCount, incrementReviewCount, getFavoriteCount } =
    useFavoriteStore();

  const [filter, setFilter] = useState<ReviewFilter>('today');
  const [sessionRated, setSessionRated] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const celebratedRef = useRef(false);

  const eod = useMemo(() => endOfTodayMs(), []);

  const dueFavorites = useMemo(() => {
    const now = Date.now();
    return favoriteItems.filter((i) => {
      if (!i.fsrsCard) return true;
      return i.fsrsCard.due <= now;
    });
  }, [favoriteItems]);

  const dueContents = useMemo(() => {
    const now = Date.now();
    return contents.filter((c) => {
      if (!c.fsrsCard?.due) return false;
      return c.fsrsCard.due <= now;
    });
  }, [contents]);

  const dueFavoritesToday = useMemo(() => {
    return favoriteItems.filter((i) => {
      if (!i.fsrsCard) return true;
      return i.fsrsCard.due <= eod;
    });
  }, [favoriteItems, eod]);

  const dueContentsToday = useMemo(() => {
    return contents.filter((c) => {
      if (!c.fsrsCard?.due) return false;
      return c.fsrsCard.due <= eod;
    });
  }, [contents, eod]);

  const unifiedQueueAll = useMemo((): UnifiedReviewItem[] => {
    const f: UnifiedReviewItem[] = dueFavorites.map((item) => ({
      kind: 'favorites',
      due: item.fsrsCard?.due ?? 0,
      item: {
        id: item.id,
        text: item.text,
        translation: item.translation,
        context: item.context,
        fsrsCard: item.fsrsCard,
      },
    }));
    const c: UnifiedReviewItem[] = dueContents.map((content) => ({
      kind: 'content',
      due: content.fsrsCard!.due,
      content,
    }));
    return [...f, ...c].sort((a, b) => a.due - b.due);
  }, [dueFavorites, dueContents]);

  const unifiedQueueToday = useMemo((): UnifiedReviewItem[] => {
    const f: UnifiedReviewItem[] = dueFavoritesToday.map((item) => ({
      kind: 'favorites',
      due: item.fsrsCard?.due ?? 0,
      item: {
        id: item.id,
        text: item.text,
        translation: item.translation,
        context: item.context,
        fsrsCard: item.fsrsCard,
      },
    }));
    const c: UnifiedReviewItem[] = dueContentsToday.map((content) => ({
      kind: 'content',
      due: content.fsrsCard!.due,
      content,
    }));
    return [...f, ...c].sort((a, b) => a.due - b.due);
  }, [dueFavoritesToday, dueContentsToday]);

  const baseQueue = filter === 'today' ? unifiedQueueToday : unifiedQueueAll;

  const filteredQueue = useMemo(() => {
    if (filter === 'today' || filter === 'all') return baseQueue;
    if (filter === 'favorites') return baseQueue.filter((i) => i.kind === 'favorites');
    return baseQueue.filter((i) => i.kind === 'content');
  }, [baseQueue, filter]);

  const current = filteredQueue[0];
  const favoriteCounts = getFavoriteCount();

  const totalDueAll = dueFavorites.length + dueContents.length;
  const todayDueTotal = dueFavoritesToday.length + dueContentsToday.length;

  const sessionProgressDenominator = sessionRated + filteredQueue.length;
  const sessionProgress = sessionProgressDenominator > 0 ? Math.min(1, sessionRated / sessionProgressDenominator) : 0;

  const todayPlanTotal = filter === 'today' ? sessionRated + filteredQueue.length : 0;
  const todayPlanProgress = filter === 'today' && todayPlanTotal > 0 ? sessionRated / todayPlanTotal : 0;

  const forecast = useMemo(() => {
    const times = collectDueTimestamps(favoriteItems, contents);
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const t0 = tomorrow.getTime();
    const t1 = endOfDay(tomorrow).getTime();
    const tomorrowCount = times.filter((x) => x >= t0 && x <= t1).length;
    const horizonEnd = endOfDay(addDays(new Date(), 7)).getTime();
    const afterTodayEnd = endOfDay(new Date()).getTime();
    const weekCount = times.filter((x) => x > afterTodayEnd && x <= horizonEnd).length;
    return { tomorrowCount, weekCount };
  }, [favoriteItems, contents]);

  const formattedDate = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date()),
    [],
  );

  const showCelebration =
    filter === 'today' && sessionRated > 0 && filteredQueue.length === 0 && !current && todayPlanTotal > 0;

  useEffect(() => {
    if (showCelebration && !celebratedRef.current) {
      celebratedRef.current = true;
      void haptics.success();
    }
    if (!showCelebration) {
      celebratedRef.current = false;
    }
  }, [showCelebration]);

  const handleRate = (rating: Rating) => {
    if (!current) return;
    if (current.kind === 'favorites') {
      gradeFavorite(current.item.id, rating);
    } else {
      gradeContent(current.content.id, rating);
      incrementReviewCount();
    }
    setSessionRated((n) => n + 1);
  };

  const resetSessionProgress = useCallback((next: ReviewFilter) => {
    setFilter(next);
    setSessionRated(0);
    sessionStartRef.current = Date.now();
    celebratedRef.current = false;
  }, []);

  useEffect(() => {
    const requested = Array.isArray(params.filter) ? params.filter[0] : params.filter;
    if (requested && ['today', 'all', 'favorites', 'content'].includes(requested) && requested !== filter) {
      resetSessionProgress(requested as ReviewFilter);
    }
  }, [filter, params.filter, resetSessionProgress]);

  const sessionMinutes = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60_000));

  const renderCelebration = () => (
    <Animated.View entering={FadeIn.duration(380)} style={styles.emptyState}>
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <MaterialCommunityIcons name="check-decagram" size={88} color={colors.success} />
      </Animated.View>
      <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface, marginTop: 16 }]}>
        {t('review.allDone')}
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
        {t('review.allDoneSubtitle')}
      </Text>
      <View style={[styles.celebrationStats, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.celebrationStatCol}>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            {t('review.itemsReviewed')}
          </Text>
          <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700' }}>
            {sessionRated}
          </Text>
        </View>
        <View style={[styles.celebrationStatCol, { marginLeft: 32 }]}>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
            {t('review.timeSpent')}
          </Text>
          <Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700' }}>
            {tInterpolate('review.minutesShort', { n: sessionMinutes })}
          </Text>
        </View>
      </View>
      <Button mode="contained-tonal" onPress={() => router.back()} style={{ marginTop: 12, alignSelf: 'stretch' }}>
        {t('review.comeBackTomorrow')}
      </Button>
      <Button
        mode="text"
        onPress={() => resetSessionProgress('all')}
        textColor={colors.primary}
        style={{ marginTop: 4 }}
      >
        {t('review.continueExtra')}
      </Button>
    </Animated.View>
  );

  const renderBody = () => {
    if (showCelebration) {
      return renderCelebration();
    }

    if (current) {
      return current.kind === 'favorites' ? (
        <ReviewCardComponent key={current.item.id} card={current.item} onRate={handleRate} />
      ) : (
        <ContentReviewCard key={current.content.id} content={current.content} onRate={handleRate} />
      );
    }

    const hasFavoriteDeck = favoriteItems.length > 0;
    const hasLibrary = contents.length > 0;
    const globallyCaughtUp = dueFavorites.length === 0 && dueContents.length === 0;
    const todayCaughtUp = dueFavoritesToday.length === 0 && dueContentsToday.length === 0;

    if (!hasFavoriteDeck && !hasLibrary) {
      return (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            Nothing to review yet
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Add favorites or open the Library to seed practice content. FSRS will schedule items here when they are due.
          </Text>
          <Button
            mode="contained"
            onPress={addSampleFavorites}
            style={{ marginBottom: 12 }}
            buttonColor={vocabularyColors.primary}
            textColor={colors.onPrimary}
          >
            Load demo favorites
          </Button>
          <Button mode="outlined" onPress={() => router.push('/(tabs)/library')} textColor={listenColors.primary}>
            Go to Library
          </Button>
        </View>
      );
    }

    if (filter === 'today' && todayCaughtUp && !globallyCaughtUp) {
      return (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            {t('review.nothingDueToday')}
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            {t('review.nothingDueTodayHint')}
          </Text>
          <Button mode="contained-tonal" onPress={() => resetSessionProgress('all')}>
            {t('review.filterAll')}
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
            No favorites or library content is due right now. Come back later or practice from the Library to move
            schedules forward.
          </Text>
          <Text variant="bodySmall" style={[styles.emptySubtext, { color: colors.onSurfaceSecondary }]}>
            You completed {todayReviewCount} rating{todayReviewCount === 1 ? '' : 's'} today
          </Text>
        </View>
      );
    }

    if (filter === 'favorites') {
      return (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No favorites due
          </Text>
          <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            Try All or Content, or check back when your favorite cards are due.
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
            Practice items in Listen, Read, or Write to schedule reviews, or switch to All / Favorites.
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
        <Appbar.Content title={t('review.title')} titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>

      {filter === 'today' ? (
        <View style={[styles.dailyHeader, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <View style={styles.dailyHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, fontWeight: '600' }}>
                {t('review.dailyPlan')}
              </Text>
              <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600', marginTop: 2 }}>
                {formattedDate}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                {tInterpolate('review.planProgress', {
                  done: sessionRated,
                  total: Math.max(sessionRated + filteredQueue.length, todayDueTotal),
                })}
              </Text>
            </View>
            <DailyRing
              progress={todayPlanTotal > 0 ? todayPlanProgress : 0}
              color={colors.primary}
              trackColor={colors.borderLight}
            />
          </View>
        </View>
      ) : null}

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
              {t('review.dueToday')}
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.primary }]}>
              {todayDueTotal}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="labelSmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Favorites
            </Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: vocabularyColors.primary }]}>
              {dueFavorites.length}
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
          Deck: {favoriteCounts.new} new · {favoriteCounts.learning} learning · {favoriteCounts.review} review
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <View
            style={[styles.progressFill, { width: `${sessionProgress * 100}%`, backgroundColor: colors.primary }]}
          />
        </View>
        <Text variant="labelSmall" style={[styles.progressCaption, { color: colors.onSurfaceVariant }]}>
          {tInterpolate('review.sessionProgress', { done: sessionRated, left: filteredQueue.length })}
        </Text>
      </View>

      <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
        <SegmentedButtons
          value={filter}
          onValueChange={(v) => resetSessionProgress(v as ReviewFilter)}
          buttons={[
            { value: 'today', label: t('review.filterToday') },
            { value: 'all', label: t('review.filterAll') },
            { value: 'favorites', label: t('review.filterFavorites') },
            { value: 'content', label: t('review.filterContent') },
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
        {!showCelebration ? (
          <View style={[styles.forecast, { borderTopColor: colors.borderLight }]}>
            <Text variant="labelSmall" style={[styles.forecastTitle, { color: colors.onSurfaceVariant }]}>
              {t('review.forecast')}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurface, marginTop: 4 }}>
              {tInterpolate('review.forecastLine', { tomorrow: forecast.tomorrowCount, week: forecast.weekCount })}
            </Text>
            <View style={[styles.forecastBars, { marginTop: 8 }]}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
                  Tomorrow
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, forecast.tomorrowCount * 10)}%`,
                        backgroundColor: vocabularyColors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginBottom: 4 }}>
                  7 days
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, forecast.weekCount * 4)}%`,
                        backgroundColor: listenColors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}
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
  dailyHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBar: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 56,
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
    paddingBottom: 24,
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
  celebrationStats: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  celebrationStatCol: {
    alignItems: 'flex-start',
  },
  forecast: {
    marginTop: 'auto',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  forecastTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forecastBars: {
    flexDirection: 'row',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
