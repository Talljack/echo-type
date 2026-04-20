import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useWriteStore } from '@/stores/useWriteStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export default function WriteScreen() {
  const { colors } = useAppTheme();
  const writeColors = moduleColors.write;
  const sessions = useWriteStore((state) => state.sessions);
  const getTotalTypingTime = useWriteStore((state) => state.getTotalTypingTime);
  const getAverageWPM = useWriteStore((state) => state.getAverageWPM);
  const getAverageAccuracy = useWriteStore((state) => state.getAverageAccuracy);
  const getContent = useLibraryStore((state) => state.getContent);
  const insets = useSafeAreaInsets();

  const totalMinutes = Math.floor(getTotalTypingTime() / 60);
  const avgWPM = getAverageWPM();
  const avgAccuracy = getAverageAccuracy();

  const recentSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 10);

  const handleSessionPress = (contentId: string) => {
    void haptics.light();
    router.push(`/practice/write/${contentId}`);
  };

  const handleBrowseLibrary = () => {
    void haptics.light();
    router.push('/(tabs)/library?mode=write');
  };

  const handleBrowseWordbooks = () => {
    void haptics.light();
    router.push('/wordbooks' as any);
  };

  return (
    <Screen padding={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={writeColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="pencil" size={40} color="#FFFFFF" />
            <Text style={[styles.title, { color: '#FFFFFF', fontFamily: fontFamily.headingBold }]}>Write</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalMinutes}</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>minutes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{avgWPM}</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>avg WPM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{avgAccuracy}%</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>accuracy</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {recentSessions.length > 0 ? (
            <>
              <Animated.View entering={FadeInDown.delay(100)}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                  Recent Sessions
                </Text>
                {recentSessions.map((session) => {
                  const contentItem = getContent(session.contentId);
                  return (
                    <Pressable
                      key={session.id}
                      style={({ pressed }) => [
                        styles.sessionCard,
                        { backgroundColor: colors.surface },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleSessionPress(session.contentId)}
                    >
                      <View style={[styles.sessionIcon, { backgroundColor: writeColors.background }]}>
                        <MaterialCommunityIcons name="pencil" size={20} color={writeColors.primary} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text
                          style={[styles.sessionTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                          numberOfLines={1}
                        >
                          {contentItem?.title || 'Untitled'}
                        </Text>
                        <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                          {session.wpm} WPM · {session.accuracy}% accuracy
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="play-circle" size={28} color={writeColors.primary} />
                    </Pressable>
                  );
                })}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200)}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                  Quick Start
                </Text>
                <View style={styles.quickStartRow}>
                  <Button
                    mode="contained"
                    onPress={handleBrowseLibrary}
                    style={[styles.quickButton, { backgroundColor: writeColors.primary }]}
                    labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                    icon="book-open-variant"
                  >
                    Library
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleBrowseWordbooks}
                    style={[styles.quickButton, { backgroundColor: colors.primary }]}
                    labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                    icon="card-text-outline"
                  >
                    Wordbooks
                  </Button>
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <MaterialCommunityIcons name="pencil" size={64} color={colors.onSurfaceSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                Start Writing
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
                Practice typing English text — improve speed and accuracy with real-time feedback
              </Text>
              <View style={styles.quickStartRow}>
                <Button
                  mode="contained"
                  onPress={handleBrowseLibrary}
                  style={[styles.quickButton, { backgroundColor: writeColors.primary }]}
                  labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                  icon="book-open-variant"
                >
                  Library
                </Button>
                <Button
                  mode="contained"
                  onPress={handleBrowseWordbooks}
                  style={[styles.quickButton, { backgroundColor: colors.primary }]}
                  labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                  icon="card-text-outline"
                >
                  Wordbooks
                </Button>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 140,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderCurve: 'continuous',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderCurve: 'continuous',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  libraryButton: {
    borderRadius: 14,
    marginTop: 8,
    borderCurve: 'continuous',
  },
  quickStartRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickButton: {
    flex: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
