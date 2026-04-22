import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';
import { ReviewForecastCard } from '@/components/dashboard/ReviewForecastCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getDashboardModuleRoute } from '@/features/content/get-dashboard-module-route';
import { useI18n } from '@/hooks/useI18n';
import { resolveAiProviderConfig } from '@/lib/ai-providers';
import { computeReviewForecastCounts } from '@/lib/dashboard-time';
import { haptics } from '@/lib/haptics';
import { useAiProviderStore } from '@/stores/useAiProviderStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { useReadStore } from '@/stores/useReadStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { useWriteStore } from '@/stores/useWriteStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type HomeModuleId = 'listen' | 'speak' | 'read' | 'write';

function buildModule(
  id: HomeModuleId,
  partial: {
    title: string;
    subtitle: string;
    icon: string;
    progress: number;
    route: string;
  },
) {
  return {
    id,
    ...partial,
    color: moduleColors[id].primary,
    gradient: moduleColors[id].gradient,
  };
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuthStore();
  const { stats, activities } = useDashboardStore();
  const settings = useSettingsStore((s) => s.settings);
  const activeProviderConfig = useAiProviderStore((s) => s.providers[s.activeProviderId]);
  const aiProviderConfigured = !!resolveAiProviderConfig(activeProviderConfig, settings);
  const favoriteItems = useFavoriteStore((s) => s.items);
  const [aiSetupBannerDismissed, setAiSetupBannerDismissed] = useState(false);

  // Get real stats from stores
  const listenSessions = useListenStore((state) => state.sessions);
  const speakSessions = useSpeakStore((state) => state.sessions);
  const readSessions = useReadStore((state) => state.sessions);
  const writeSessions = useWriteStore((state) => state.sessions);
  const libraryContents = useLibraryStore((state) => state.contents);

  const contentTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of libraryContents) {
      map.set(c.id, c.title);
    }
    return map;
  }, [libraryContents]);

  const reviewForecastCounts = useMemo(() => {
    const dueTs = libraryContents
      .map((c) => c.fsrsCard?.due)
      .filter((due): due is number => typeof due === 'number' && Number.isFinite(due));
    return computeReviewForecastCounts(dueTs);
  }, [libraryContents]);

  const dueFavoriteCount = useMemo(() => {
    const t = Date.now();
    return favoriteItems.filter((i) => !i.fsrsCard || i.fsrsCard.due <= t).length;
  }, [favoriteItems]);

  const totalLibraryCount = libraryContents.length;

  const totalWordsPracticed = useMemo(() => {
    const fromRead = readSessions.reduce((sum, s) => sum + (s.wordsRead ?? 0), 0);
    const fromWrite = writeSessions.reduce((sum, s) => {
      const minutes = s.duration / 60;
      return sum + Math.max(0, Math.round(s.wpm * minutes));
    }, 0);
    return fromRead + fromWrite;
  }, [readSessions, writeSessions]);

  const { avgAccuracy, avgWpm } = useMemo(() => {
    const accuracySamples: number[] = [...writeSessions.map((s) => s.accuracy), ...speakSessions.map((s) => s.score)];
    const acc =
      accuracySamples.length > 0 ? Math.round(accuracySamples.reduce((a, b) => a + b, 0) / accuracySamples.length) : 0;
    const wpm =
      writeSessions.length > 0
        ? Math.round(writeSessions.reduce((sum, s) => sum + s.wpm, 0) / writeSessions.length)
        : 0;
    return { avgAccuracy: acc, avgWpm: wpm };
  }, [writeSessions, speakSessions]);

  const suggestedPracticeMinutes = useMemo(
    () => Math.min(45, Math.max(10, 5 + dueFavoriteCount * 3)),
    [dueFavoriteCount],
  );

  const totalListenTime = useListenStore((state) => state.getTotalListenTime());
  const totalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime());
  const totalReadTime = useReadStore((state) => state.getTotalReadTime());
  const totalTypingTime = useWriteStore((state) => state.getTotalTypingTime());

  const totalMinutes = Math.floor((totalListenTime + totalSpeakTime + totalReadTime + totalTypingTime) / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const modules = [
    buildModule('listen', {
      title: 'Listen',
      subtitle: 'Improve comprehension',
      icon: 'headphones',
      progress: listenSessions.length > 0 ? Math.min(listenSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('listen'),
    }),
    buildModule('speak', {
      title: t('speak.title'),
      subtitle: 'Practice pronunciation',
      icon: 'microphone',
      progress: speakSessions.length > 0 ? Math.min(speakSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('speak'),
    }),
    buildModule('read', {
      title: 'Read',
      subtitle: 'Build vocabulary',
      icon: 'book-open-variant',
      progress: readSessions.length > 0 ? Math.min(readSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('read'),
    }),
    buildModule('write', {
      title: t('write.title'),
      subtitle: 'Express yourself',
      icon: 'pencil',
      progress: writeSessions.length > 0 ? Math.min(writeSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('write'),
    }),
  ];

  const progressData = [
    {
      label: 'Listen',
      value: listenSessions.length,
      total: 10,
      color: moduleColors.listen.primary,
    },
    {
      label: t('speak.title'),
      value: speakSessions.length,
      total: 10,
      color: moduleColors.speak.primary,
    },
    {
      label: 'Read',
      value: readSessions.length,
      total: 10,
      color: moduleColors.read.primary,
    },
    {
      label: t('write.title'),
      value: writeSessions.length,
      total: 10,
      color: moduleColors.write.primary,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant, fontSize: 17 }}>
              {t('dashboard.welcome')}
            </Text>
            <Text style={[styles.userName, { color: colors.onBackground }]}>
              {user?.email?.split('@')[0] || t('dashboard.learner')}
            </Text>
          </View>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={[styles.headerAvatar, { shadowColor: colors.primary }]}
          >
            <MaterialCommunityIcons name="account" size={32} color={colors.onPrimary} />
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
          <StatCard
            label={t('dashboard.streak')}
            value={stats.streak}
            color={moduleColors.speak.primary}
            subtitle={stats.streak > 0 ? t('dashboard.keepItUp') : t('dashboard.startToday')}
          />
          <StatCard
            label={t('dashboard.totalTime')}
            value={totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}
            color={colors.secondary}
          />
          <StatCard
            label={t('dashboard.sessions')}
            value={listenSessions.length + speakSessions.length + readSessions.length + writeSessions.length}
            color={colors.accent}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240)} style={styles.metricsGrid}>
          <View style={styles.metricCell}>
            <StatCard label="Library" value={totalLibraryCount} color={colors.primary} />
          </View>
          <View style={styles.metricCell}>
            <StatCard
              label="Words practiced"
              value={totalWordsPracticed >= 1000 ? totalWordsPracticed.toLocaleString() : totalWordsPracticed}
              color={colors.primaryDark}
            />
          </View>
          <View style={styles.metricCell}>
            <StatCard
              label="Avg accuracy"
              value={avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
              color={colors.accent}
              subtitle={avgAccuracy === 0 ? 'Speak & write' : undefined}
            />
          </View>
          <View style={styles.metricCell}>
            <StatCard
              label="Avg WPM"
              value={writeSessions.length > 0 ? avgWpm : '—'}
              color={moduleColors.write.primary}
              subtitle={writeSessions.length === 0 ? 'Write module' : undefined}
            />
          </View>
        </Animated.View>

        {!aiProviderConfigured && !aiSetupBannerDismissed && (
          <Animated.View entering={FadeInDown.delay(260)} style={styles.aiBannerWrap}>
            <View
              style={[
                styles.aiBanner,
                {
                  backgroundColor: colors.primaryContainer,
                  borderColor: colors.primaryLight,
                },
              ]}
            >
              <Pressable
                accessibilityLabel="Dismiss AI provider setup reminder"
                accessibilityHint="Double tap to dismiss this banner"
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => {
                  void haptics.light();
                  setAiSetupBannerDismissed(true);
                }}
                style={styles.aiBannerDismiss}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceSecondary} />
              </Pressable>
              <View style={styles.aiBannerTopRow}>
                <LinearGradient
                  colors={[colors.secondary, colors.primary]}
                  style={styles.aiBannerIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name="creation" size={22} color={colors.onPrimary} />
                </LinearGradient>
                <View style={styles.aiBannerText}>
                  <Text variant="titleSmall" style={[styles.aiBannerTitle, { color: colors.onPrimaryContainer }]}>
                    Set up AI Provider
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                    Add an API key in Settings to unlock AI Tutor and smarter practice features.
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.aiBannerCta,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => {
                  void haptics.medium();
                  router.push({ pathname: '/(tabs)/settings', params: { openAi: '1' } } as Href);
                }}
                accessibilityRole="button"
                accessibilityLabel="Open Settings to set up AI provider"
                accessibilityHint="Double tap to go to settings and add an API key"
              >
                <MaterialCommunityIcons name="cog-outline" size={18} color={colors.onPrimary} />
                <Text variant="labelLarge" style={{ color: colors.onPrimary, marginLeft: 6, fontWeight: '700' }}>
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Activity Heatmap */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <ActivityHeatmap data={activities} />
        </Animated.View>

        {/* Progress Chart */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <ProgressChart data={progressData} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Analytics. Trends, time by module and review outlook"
            accessibilityHint="Double tap to view detailed analytics"
            style={({ pressed }) => [
              styles.analyticsLink,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                shadowColor: '#000',
              },
              pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              void haptics.light();
              router.push('/analytics' as Href);
            }}
          >
            <View style={[styles.analyticsIconWrap, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ color: colors.onSurface, fontFamily: fontFamily.heading, fontWeight: '700' }}
              >
                View Analytics
              </Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 2 }}>
                Trends, time by module & review outlook
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceSecondary} />
          </Pressable>
        </Animated.View>

        {/* Learning Modules */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.onBackground }]}>
            Continue Learning
          </Text>
          <View style={styles.modulesGrid}>
            {modules.map((module, index) => (
              <Animated.View
                key={module.id}
                entering={FadeInRight.delay(500 + index * 100)}
                style={styles.moduleCardWrapper}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.moduleCard,
                    { backgroundColor: colors.surface },
                    pressed && styles.moduleCardPressed,
                  ]}
                  onPress={() => {
                    void haptics.light();
                    router.push(module.route as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${module.title}. ${module.subtitle}. Progress: ${Math.round(module.progress * 100)}%`}
                  accessibilityHint="Double tap to practice this module"
                >
                  <LinearGradient colors={module.gradient} style={styles.moduleGradient}>
                    <View style={[styles.moduleIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <MaterialCommunityIcons name={module.icon as any} size={28} color={colors.onPrimary} />
                    </View>
                    <Text variant="titleMedium" style={[styles.moduleTitle, { color: colors.onPrimary }]}>
                      {module.title}
                    </Text>
                    <Text variant="bodySmall" style={[styles.moduleSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
                      {module.subtitle}
                    </Text>
                    <View style={styles.moduleProgress}>
                      <ProgressBar
                        progress={module.progress}
                        color={colors.onPrimary}
                        style={styles.moduleProgressBar}
                      />
                      <Text variant="labelSmall" style={[styles.moduleProgressText, { color: colors.onPrimary }]}>
                        {Math.round(module.progress * 100)}%
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.onBackground }]}>
            Quick Actions
          </Text>

          <Animated.View entering={FadeInDown.delay(900)}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface },
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => router.push('/chat')}
              accessibilityRole="button"
              accessibilityLabel="AI Tutor. Practice English conversation with AI"
              accessibilityHint="Double tap to start AI conversation"
            >
              <LinearGradient colors={[moduleColors.ai.primary, moduleColors.ai.light]} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialCommunityIcons name="robot" size={28} color={colors.onPrimary} />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: colors.onPrimary }]}>
                      AI Tutor
                    </Text>
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      Practice English conversation with AI
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1000)}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: colors.surface },
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => router.push('/review')}
              accessibilityRole="button"
              accessibilityLabel="Review. Spaced repetition vocabulary review"
              accessibilityHint="Double tap to start reviewing vocabulary"
            >
              <LinearGradient colors={[colors.accent, '#66D97A']} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialCommunityIcons name="cards" size={28} color={colors.onPrimary} />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: colors.onPrimary }]}>
                      Review
                    </Text>
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      Spaced repetition vocabulary review
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Today's Summary */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.onBackground }]}>
            Today
          </Text>
          <Animated.View entering={FadeInDown.delay(1050)}>
            <View
              style={[
                styles.todayGoalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View style={styles.todayGoalHeader}>
                <MaterialCommunityIcons name="flag-checkered" size={22} color={colors.primary} />
                <Text variant="titleMedium" style={[styles.todayGoalTitle, { color: colors.onSurface }]}>
                  {"Today's goal"}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, marginTop: 8, lineHeight: 22 }}>
                {dueFavoriteCount > 0
                  ? `${dueFavoriteCount} favorite${dueFavoriteCount === 1 ? '' : 's'} due for review. Aim for about ${suggestedPracticeMinutes} minutes of focused practice.`
                  : 'No favorites due right now. Add words while you read or listen, then review them here.'}
              </Text>
              <View style={styles.todayGoalMetaRow}>
                <View style={[styles.todayGoalPill, { backgroundColor: colors.primaryContainer }]}>
                  <MaterialCommunityIcons name="cards-outline" size={18} color={colors.primary} />
                  <Text
                    variant="labelLarge"
                    style={{ color: colors.onPrimaryContainer, marginLeft: 8, fontWeight: '700' }}
                  >
                    {dueFavoriteCount} due
                  </Text>
                </View>
                <View style={[styles.todayGoalPill, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="timer-sand" size={18} color={colors.secondary} />
                  <Text variant="labelLarge" style={{ color: colors.onSurface, marginLeft: 8, fontWeight: '700' }}>
                    ~{suggestedPracticeMinutes} min
                  </Text>
                </View>
              </View>
              <View style={styles.todayGoalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.todayGoalChip,
                    { backgroundColor: colors.accent, borderCurve: 'continuous' },
                    pressed && styles.todayGoalChipPressed,
                  ]}
                  onPress={() => {
                    void haptics.light();
                    router.push('/review');
                  }}
                >
                  <MaterialCommunityIcons name="cards" size={18} color={colors.onPrimary} />
                  <Text variant="labelLarge" style={{ color: colors.onPrimary, marginLeft: 6, fontWeight: '700' }}>
                    Review
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.todayGoalChip,
                    { backgroundColor: colors.primary, borderCurve: 'continuous' },
                    pressed && styles.todayGoalChipPressed,
                  ]}
                  onPress={() => {
                    void haptics.light();
                    router.push('/(tabs)/library' as Href);
                  }}
                >
                  <MaterialCommunityIcons name="library" size={18} color={colors.onPrimary} />
                  <Text variant="labelLarge" style={{ color: colors.onPrimary, marginLeft: 6, fontWeight: '700' }}>
                    Library
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.todayGoalChip,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderCurve: 'continuous',
                    },
                    pressed && styles.todayGoalChipPressed,
                  ]}
                  onPress={() => {
                    void haptics.light();
                    router.push(getDashboardModuleRoute('write') as Href);
                  }}
                >
                  <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
                  <Text variant="labelLarge" style={{ color: colors.primary, marginLeft: 6, fontWeight: '700' }}>
                    Write
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(1100)}>
            <View style={[styles.todayCard, { backgroundColor: colors.surface, borderRadius: 16 }]}>
              <View style={styles.todayContent}>
                <View style={styles.todayRow}>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={colors.secondary} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      Study Time
                    </Text>
                    <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
                      {stats.totalStudyTime}m
                    </Text>
                  </View>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.accent} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      Lessons
                    </Text>
                    <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
                      {stats.lessonsCompleted}
                    </Text>
                  </View>
                  <View style={styles.todayItem}>
                    <MaterialCommunityIcons name="book-open-variant" size={20} color={moduleColors.speak.primary} />
                    <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                      Words
                    </Text>
                    <Text variant="titleMedium" style={[styles.todayValue, { color: colors.onSurface }]}>
                      {stats.wordsLearned}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
          <ReviewForecastCard counts={reviewForecastCounts} animationDelay={1180} />
        </View>

        <RecentActivitySection
          listenSessions={listenSessions}
          speakSessions={speakSessions}
          readSessions={readSessions}
          writeSessions={writeSessions}
          contentTitleById={contentTitleById}
          animationDelay={1240}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  userName: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
    fontSize: 34,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCell: {
    width: '48%',
    flexGrow: 0,
  },
  aiBannerWrap: {
    marginBottom: 24,
  },
  aiBanner: {
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 16,
    paddingTop: 18,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiBannerDismiss: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 4,
  },
  aiBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 28,
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerText: {
    flex: 1,
    minWidth: 0,
  },
  aiBannerTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
  },
  aiBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  todayGoalCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  todayGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todayGoalTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
    fontSize: 18,
  },
  todayGoalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  todayGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  todayGoalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  todayGoalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
  },
  todayGoalChipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
    marginBottom: 16,
    fontSize: 22,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCardWrapper: {
    width: '48%',
  },
  moduleCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  moduleCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  moduleGradient: {
    padding: 18,
    minHeight: 180,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
    marginBottom: 4,
    fontSize: 17,
  },
  moduleSubtitle: {
    marginBottom: 12,
    lineHeight: 18,
  },
  moduleProgress: {
    marginTop: 'auto',
  },
  moduleProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  moduleProgressText: {
    fontWeight: '700',
    marginTop: 8,
    fontSize: 13,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionGradient: {
    padding: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTextContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '700',
    marginBottom: 2,
    fontSize: 17,
  },
  todayCard: {
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  todayContent: {
    padding: 20,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayItem: {
    alignItems: 'center',
    gap: 4,
  },
  todayValue: {
    fontWeight: '700',
  },
  analyticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
