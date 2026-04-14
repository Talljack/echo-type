import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
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
      color: '#7C3AED',
      progress: listenSessions.length > 0 ? Math.min(listenSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('listen'),
    },
    {
      id: 'speak',
      title: 'Speak',
      subtitle: 'Practice pronunciation',
      icon: 'microphone',
      color: '#EC4899',
      progress: speakSessions.length > 0 ? Math.min(speakSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('speak'),
    },
    {
      id: 'read',
      title: 'Read',
      subtitle: 'Build vocabulary',
      icon: 'book-open-variant',
      color: '#16A34A',
      progress: readSessions.length > 0 ? Math.min(readSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('read'),
    },
    {
      id: 'write',
      title: 'Write',
      subtitle: 'Express yourself',
      icon: 'pencil',
      color: '#F59E0B',
      progress: writeSessions.length > 0 ? Math.min(writeSessions.length / 10, 1) : 0,
      route: getDashboardModuleRoute('write'),
    },
  ];

  const progressData = [
    {
      label: 'Listen',
      value: listenSessions.length,
      total: 10,
      color: '#7C3AED',
    },
    {
      label: 'Speak',
      value: speakSessions.length,
      total: 10,
      color: '#EC4899',
    },
    {
      label: 'Read',
      value: readSessions.length,
      total: 10,
      color: '#16A34A',
    },
    {
      label: 'Write',
      value: writeSessions.length,
      total: 10,
      color: '#F59E0B',
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
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Welcome back,
            </Text>
            <Text variant="headlineMedium" style={[styles.userName, { color: theme.colors.onBackground }]}>
              {user?.email?.split('@')[0] || 'Learner'}
            </Text>
          </View>
          <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.headerAvatar}>
            <MaterialCommunityIcons name="account" size={28} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            label="Day Streak"
            value={stats.streak}
            color="#F59E0B"
            subtitle={stats.streak > 0 ? 'Keep it up!' : 'Start today!'}
          />
          <StatCard
            label="Total Time"
            value={totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${totalMinutes}m`}
            color="#7C3AED"
          />
          <StatCard
            label="Sessions"
            value={listenSessions.length + speakSessions.length + readSessions.length + writeSessions.length}
            color="#16A34A"
          />
        </View>

        {/* Activity Heatmap */}
        <ActivityHeatmap data={activities} />

        {/* Progress Chart */}
        <ProgressChart data={progressData} />

        {/* Learning Modules */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Continue Learning
          </Text>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <Card
                key={module.id}
                variant="elevated"
                style={styles.moduleCard}
                onPress={() => router.push(module.route as any)}
              >
                <LinearGradient colors={[`${module.color}20`, `${module.color}10`]} style={styles.moduleGradient}>
                  <View style={[styles.moduleIcon, { backgroundColor: module.color }]}>
                    <MaterialCommunityIcons name={module.icon as any} size={28} color="#FFFFFF" />
                  </View>
                  <Text variant="titleSmall" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                    {module.title}
                  </Text>
                  <Text variant="bodySmall" style={[styles.moduleSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {module.subtitle}
                  </Text>
                  <View style={styles.moduleProgress}>
                    <ProgressBar progress={module.progress} color={module.color} style={styles.moduleProgressBar} />
                    <Text variant="bodySmall" style={[styles.moduleProgressText, { color: module.color }]}>
                      {Math.round(module.progress * 100)}%
                    </Text>
                  </View>
                </LinearGradient>
              </Card>
            ))}
          </View>
        </View>

        {/* AI Tutor Card */}
        <Card variant="elevated" style={styles.tutorCard} onPress={() => router.push('/chat')}>
          <LinearGradient colors={['#6366F120', '#6366F110']} style={styles.tutorGradient}>
            <View style={styles.tutorContent}>
              <View style={[styles.moduleIcon, { backgroundColor: '#6366F1' }]}>
                <MaterialCommunityIcons name="robot" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.tutorTextContent}>
                <Text variant="titleSmall" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                  AI Tutor
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Practice English conversation with AI
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          </LinearGradient>
        </Card>

        {/* Review Card */}
        <Card variant="elevated" style={styles.tutorCard} onPress={() => router.push('/review')}>
          <LinearGradient colors={['#10B98120', '#10B98110']} style={styles.tutorGradient}>
            <View style={styles.tutorContent}>
              <View style={[styles.moduleIcon, { backgroundColor: '#10B981' }]}>
                <MaterialCommunityIcons name="cards" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.tutorTextContent}>
                <Text variant="titleSmall" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                  Review
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Spaced repetition vocabulary review
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          </LinearGradient>
        </Card>
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
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontWeight: '700',
    marginTop: 2,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleCard: {
    width: '48.5%',
    overflow: 'hidden',
  },
  moduleGradient: {
    padding: 14,
    minHeight: 160,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  moduleSubtitle: {
    marginBottom: 10,
  },
  moduleProgress: {
    marginTop: 'auto',
  },
  moduleProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  moduleProgressText: {
    fontWeight: '600',
    marginTop: 8,
  },
  tutorCard: {
    marginBottom: 20,
    overflow: 'hidden',
  },
  tutorGradient: {
    padding: 16,
  },
  tutorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tutorTextContent: {
    flex: 1,
    marginLeft: 12,
  },
});
