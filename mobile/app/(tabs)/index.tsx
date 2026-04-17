import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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
import { computeReviewForecastCounts } from '@/lib/dashboard-time';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { useReadStore } from '@/stores/useReadStore';
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
  const router = useRouter();
  const { user } = useAuthStore();
  const { stats, activities } = useDashboardStore();

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
      title: 'Speak',
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
      title: 'Write',
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
      label: 'Speak',
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
      label: 'Write',
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
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.onBackground }]}>
              {user?.email?.split('@')[0] || 'Learner'}
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
            label="Day Streak"
            value={stats.streak}
            color={moduleColors.speak.primary}
            subtitle={stats.streak > 0 ? 'Keep it up!' : 'Start today!'}
          />
          <StatCard
            label="Total Time"
            value={totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}
            color={colors.secondary}
          />
          <StatCard
            label="Sessions"
            value={listenSessions.length + speakSessions.length + readSessions.length + writeSessions.length}
            color={colors.accent}
          />
        </Animated.View>

        {/* Activity Heatmap */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <ActivityHeatmap data={activities} />
        </Animated.View>

        {/* Progress Chart */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <ProgressChart data={progressData} />
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
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(module.route as any);
                  }}
                >
                  <LinearGradient colors={module.gradient} style={styles.moduleGradient}>
                    <View style={[styles.moduleIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <MaterialCommunityIcons name={module.icon as any} size={28} color="#FFFFFF" />
                    </View>
                    <Text variant="titleMedium" style={[styles.moduleTitle, { color: '#FFFFFF' }]}>
                      {module.title}
                    </Text>
                    <Text variant="bodySmall" style={[styles.moduleSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
                      {module.subtitle}
                    </Text>
                    <View style={styles.moduleProgress}>
                      <ProgressBar progress={module.progress} color="#FFFFFF" style={styles.moduleProgressBar} />
                      <Text variant="labelSmall" style={[styles.moduleProgressText, { color: '#FFFFFF' }]}>
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
            >
              <LinearGradient colors={[moduleColors.ai.primary, moduleColors.ai.light]} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialCommunityIcons name="robot" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: '#FFFFFF' }]}>
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
            >
              <LinearGradient colors={[colors.accent, '#66D97A']} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialCommunityIcons name="cards" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: '#FFFFFF' }]}>
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
});
