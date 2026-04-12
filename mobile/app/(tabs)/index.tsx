import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/useAuthStore';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const modules = [
    {
      id: 'listen',
      title: 'Listen',
      subtitle: 'Improve comprehension',
      icon: 'headphones',
      color: '#7C3AED',
      progress: 0.65,
      route: '/(tabs)/listen',
    },
    {
      id: 'speak',
      title: 'Speak',
      subtitle: 'Practice pronunciation',
      icon: 'microphone',
      color: '#EC4899',
      progress: 0.42,
      route: '/(tabs)/speak',
    },
    {
      id: 'read',
      title: 'Read',
      subtitle: 'Build vocabulary',
      icon: 'book-open-variant',
      color: '#16A34A',
      progress: 0.78,
      route: '/(tabs)/library',
    },
    {
      id: 'write',
      title: 'Write',
      subtitle: 'Express yourself',
      icon: 'pencil',
      color: '#F59E0B',
      progress: 0.33,
      route: '/(tabs)/library',
    },
  ];

  const stats = [
    { label: 'Day Streak', value: '12', icon: 'fire', color: '#F59E0B' },
    { label: 'Total Time', value: '24h', icon: 'clock-outline', color: '#7C3AED' },
    { label: 'Words Learned', value: '342', icon: 'book-alphabet', color: '#16A34A' },
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
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Welcome back,
            </Text>
            <Text variant="displaySmall" style={[styles.userName, { color: theme.colors.onBackground }]}>
              {user?.name || 'Learner'}
            </Text>
          </View>
          <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.headerAvatar}>
            <MaterialCommunityIcons name="account" size={28} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <Card key={stat.label} variant="elevated" style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                {stat.value}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {stat.label}
              </Text>
            </Card>
          ))}
        </View>

        {/* Daily Goal */}
        <Card variant="elevated" style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                Daily Goal
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Keep up the great work!
              </Text>
            </View>
            <View style={[styles.goalBadge, { backgroundColor: `${theme.colors.tertiary}20` }]}>
              <MaterialCommunityIcons name="trophy" size={32} color={theme.colors.tertiary} />
            </View>
          </View>
          <View style={styles.goalProgress}>
            <View style={styles.goalProgressHeader}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '500' }}>
                18 / 30 minutes
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.tertiary, fontWeight: '600' }}>
                60%
              </Text>
            </View>
            <ProgressBar progress={0.6} color={theme.colors.tertiary} style={styles.progressBar} />
          </View>
        </Card>

        {/* Learning Modules */}
        <View style={styles.section}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
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
                    <MaterialCommunityIcons name={module.icon as any} size={32} color="#FFFFFF" />
                  </View>
                  <Text variant="titleMedium" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                    {module.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                    {module.subtitle}
                  </Text>
                  <View style={styles.moduleProgress}>
                    <ProgressBar progress={module.progress} color={module.color} style={styles.moduleProgressBar} />
                    <Text variant="bodySmall" style={{ color: module.color, fontWeight: '600', marginTop: 4 }}>
                      {Math.round(module.progress * 100)}%
                    </Text>
                  </View>
                </LinearGradient>
              </Card>
            ))}
          </View>
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
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  userName: {
    fontWeight: '700',
    marginTop: 4,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontWeight: '700',
    marginBottom: 4,
  },
  goalCard: {
    marginBottom: 24,
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  goalBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalProgress: {
    gap: 8,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '48%',
    overflow: 'hidden',
  },
  moduleGradient: {
    padding: 16,
    minHeight: 180,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleProgress: {
    marginTop: 'auto',
  },
  moduleProgressBar: {
    height: 6,
    borderRadius: 3,
  },
});
