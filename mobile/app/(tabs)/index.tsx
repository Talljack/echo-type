import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { getDashboardModuleRoute } from '@/features/content/get-dashboard-module-route';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useListenStore } from '@/stores/useListenStore';
import { useReadStore } from '@/stores/useReadStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { useWriteStore } from '@/stores/useWriteStore';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { stats, activities } = useDashboardStore();

  // Get real stats from stores
  const listenSessions = useListenStore((state) => state.sessions);
  const speakSessions = useSpeakStore((state) => state.sessions);
  const readSessions = useReadStore((state) => state.sessions);
  const writeSessions = useWriteStore((state) => state.sessions);

  const totalListenTime = useListenStore((state) => state.getTotalListenTime());
  const totalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime());
  const totalReadTime = useReadStore((state) => state.getTotalReadTime());
  const totalTypingTime = useWriteStore((state) => state.getTotalTypingTime());

  const totalMinutes = Math.floor((totalListenTime + totalSpeakTime + totalReadTime + totalTypingTime) / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const modules = [
    {
      id: 'listen',
      title: 'Listen',
      subtitle: 'Improve comprehension',
      icon: 'headphones',
      color: '#FF2D55',
      gradient: ['#FF2D55', '#FF6482'],
      progress: listenSessions.length > 0 ? Math.min(listenSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('listen'),
    },
    {
      id: 'speak',
      title: 'Speak',
      subtitle: 'Practice pronunciation',
      icon: 'microphone',
      color: '#FF9500',
      gradient: ['#FF9500', '#FFB340'],
      progress: speakSessions.length > 0 ? Math.min(speakSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('speak'),
    },
    {
      id: 'read',
      title: 'Read',
      subtitle: 'Build vocabulary',
      icon: 'book-open-variant',
      color: '#5856D6',
      gradient: ['#5856D6', '#7D7AFF'],
      progress: readSessions.length > 0 ? Math.min(readSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('read'),
    },
    {
      id: 'write',
      title: 'Write',
      subtitle: 'Express yourself',
      icon: 'pencil',
      color: '#FFCC00',
      gradient: ['#FFCC00', '#FFD740'],
      progress: writeSessions.length > 0 ? Math.min(writeSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('write'),
    },
  ];

  const progressData = [
    {
      label: 'Listen',
      value: listenSessions.length,
      total: 10,
      color: '#FF2D55',
    },
    {
      label: 'Speak',
      value: speakSessions.length,
      total: 10,
      color: '#FF9500',
    },
    {
      label: 'Read',
      value: readSessions.length,
      total: 10,
      color: '#5856D6',
    },
    {
      label: 'Write',
      value: writeSessions.length,
      total: 10,
      color: '#FFCC00',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, fontSize: 17 }}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: theme.colors.onBackground }]}>
              {user?.email?.split('@')[0] || 'Learner'}
            </Text>
          </View>
          <LinearGradient colors={['#AF52DE', '#BF5AF2']} style={styles.headerAvatar}>
            <MaterialCommunityIcons name="account" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
          <StatCard
            label="Day Streak"
            value={stats.streak}
            color="#FF9500"
            subtitle={stats.streak > 0 ? 'Keep it up!' : 'Start today!'}
          />
          <StatCard
            label="Total Time"
            value={totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}
            color="#AF52DE"
          />
          <StatCard
            label="Sessions"
            value={listenSessions.length + speakSessions.length + readSessions.length + writeSessions.length}
            color="#34C759"
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
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
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
                    { backgroundColor: theme.colors.surface },
                    pressed && styles.moduleCardPressed,
                  ]}
                  onPress={() => router.push(module.route as any)}
                >
                  <LinearGradient colors={module.gradient} style={styles.moduleGradient}>
                    <View style={[styles.moduleIcon, { backgroundColor: module.color }]}>
                      <MaterialCommunityIcons name={module.icon as any} size={28} color="#FFFFFF" />
                    </View>
                    <Text variant="titleMedium" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                      {module.title}
                    </Text>
                    <Text variant="bodySmall" style={[styles.moduleSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                      {module.subtitle}
                    </Text>
                    <View style={styles.moduleProgress}>
                      <ProgressBar progress={module.progress} color={module.color} style={styles.moduleProgressBar} />
                      <Text variant="labelSmall" style={[styles.moduleProgressText, { color: module.color }]}>
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
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Quick Actions
          </Text>

          <Animated.View entering={FadeInDown.delay(900)}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => router.push('/chat')}
            >
              <LinearGradient colors={['#007AFF', '#5AC8FA']} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: '#007AFF' }]}>
                    <MaterialCommunityIcons name="robot" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
                      AI Tutor
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Practice English conversation with AI
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1000)}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
                pressed && styles.actionCardPressed,
              ]}
              onPress={() => router.push('/review')}
            >
              <LinearGradient colors={['#34C759', '#66D97A']} style={styles.actionGradient}>
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: '#34C759' }]}>
                    <MaterialCommunityIcons name="cards" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.actionTextContent}>
                    <Text variant="titleMedium" style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
                      Review
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Spaced repetition vocabulary review
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
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
    fontWeight: '700',
    fontSize: 34,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
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
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  moduleProgressText: {
    fontWeight: '700',
    marginTop: 8,
    fontSize: 13,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
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
    fontWeight: '700',
    marginBottom: 2,
    fontSize: 17,
  },
});
