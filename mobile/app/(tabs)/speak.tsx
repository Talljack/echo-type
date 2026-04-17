import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { fontFamily } from '@/theme/typography';

export default function SpeakScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');
  const sessions = useSpeakStore((state) => state.sessions);
  const getTotalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime);
  const getAverageScore = useSpeakStore((state) => state.getAverageScore);
  const getContent = useLibraryStore((state) => state.getContent);
  const insets = useSafeAreaInsets();

  const totalMinutes = Math.floor(getTotalSpeakTime() / 60);
  const avgScore = getAverageScore();

  const recentSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 10);

  const handleSessionPress = (contentId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/practice/speak/${contentId}` as any);
  };

  const handleBrowseLibrary = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/library');
  };

  return (
    <Screen scrollable>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Gradient Header */}
        <LinearGradient colors={speakColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="microphone" size={40} color={colors.onPrimary} />
            <Text style={[styles.title, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>Speak</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{totalMinutes}</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>minutes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{sessions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>sessions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{avgScore}%</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>avg score</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {recentSessions.length > 0 ? (
            <>
              {/* Recent Sessions */}
              <Animated.View entering={FadeInDown.delay(100)}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                  Recent Sessions
                </Text>
                {recentSessions.map((session) => {
                  const contentItem = getContent(session.contentId);
                  const durationMin = Math.floor((session.duration || 0) / 60);
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
                      <View style={[styles.sessionIcon, { backgroundColor: speakColors.background }]}>
                        <MaterialCommunityIcons name="microphone" size={20} color={speakColors.primary} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text
                          style={[styles.sessionTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                          numberOfLines={1}
                        >
                          {contentItem?.title || 'Untitled'}
                        </Text>
                        <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                          {durationMin > 0 ? `${durationMin}m` : '<1m'} • Score: {session.score ?? '--'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="play-circle" size={28} color={speakColors.primary} />
                    </Pressable>
                  );
                })}
              </Animated.View>

              {/* AI Conversation */}
              <Pressable
                style={({ pressed }) => [
                  styles.conversationCard,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/practice/speak/conversation');
                }}
              >
                <LinearGradient colors={speakColors.gradient} style={styles.conversationGradient}>
                  <MaterialCommunityIcons name="robot" size={32} color={colors.onPrimary} />
                </LinearGradient>
                <View style={styles.conversationInfo}>
                  <Text style={[styles.conversationTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                    AI Conversation
                  </Text>
                  <Text style={[styles.conversationSubtitle, { color: colors.onSurfaceSecondary }]}>
                    Practice speaking with AI in real-time
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>

              {/* Quick Start */}
              <Animated.View entering={FadeInDown.delay(200)}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                  Quick Start
                </Text>
                <Button
                  mode="contained"
                  onPress={handleBrowseLibrary}
                  style={[styles.libraryButton, { backgroundColor: speakColors.primary }]}
                  labelStyle={{ color: colors.onPrimary, fontFamily: fontFamily.bodyMedium }}
                  icon="book-open-variant"
                >
                  Browse Library
                </Button>
              </Animated.View>
            </>
          ) : (
            /* Empty State */
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <MaterialCommunityIcons name="microphone" size={64} color={colors.onSurfaceSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                Start Speaking
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
                Choose content from your library to begin speaking practice
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.conversationCard,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/practice/speak/conversation');
                }}
              >
                <LinearGradient colors={speakColors.gradient} style={styles.conversationGradient}>
                  <MaterialCommunityIcons name="robot" size={32} color={colors.onPrimary} />
                </LinearGradient>
                <View style={styles.conversationInfo}>
                  <Text style={[styles.conversationTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                    AI Conversation
                  </Text>
                  <Text style={[styles.conversationSubtitle, { color: colors.onSurfaceSecondary }]}>
                    Practice speaking with AI in real-time
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>

              <Button
                mode="contained"
                onPress={handleBrowseLibrary}
                style={[styles.libraryButton, { backgroundColor: speakColors.primary }]}
                labelStyle={{ color: colors.onPrimary, fontFamily: fontFamily.bodyMedium }}
                icon="book-open-variant"
              >
                Choose from Library
              </Button>
            </Animated.View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
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
    flex: 1,
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
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderCurve: 'continuous',
  },
  conversationGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderCurve: 'continuous',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  conversationSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  libraryButton: {
    borderRadius: 14,
    marginTop: 8,
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
