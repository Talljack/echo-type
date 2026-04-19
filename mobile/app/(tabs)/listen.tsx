import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import type { Content } from '@/types/content';

export default function ListenScreen() {
  const { colors } = useAppTheme();
  const listenColors = moduleColors.listen;
  const sessions = useListenStore((state) => state.sessions);
  const getTotalListenTime = useListenStore((state) => state.getTotalListenTime);
  const getContent = useLibraryStore((state) => state.getContent);
  const contents = useLibraryStore((state) => state.contents);
  const getDueContents = useLibraryStore((state) => state.getDueContents);
  const settings = useSettingsStore((state) => state.settings);
  const insets = useSafeAreaInsets();

  const totalMinutes = Math.floor(getTotalListenTime() / 60);

  // Get recent sessions (last 10, newest first)
  const recentSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 10);
  const continueSession = recentSessions[0];
  const olderSessions = recentSessions.slice(1);

  const recommendedForListen = useMemo((): Content[] => {
    const cap = settings.recommendationCount ?? 5;
    const withText = (c: Content) => Boolean(c.text?.trim());

    if (!settings.enableRecommendations) {
      return contents.filter((c) => c.isStarred && withText(c)).slice(0, cap);
    }

    const starred = contents.filter((c) => c.isStarred && withText(c));
    const due = getDueContents().filter(withText);
    const seen = new Set<string>();
    const out: Content[] = [];

    for (const c of [...starred, ...due, ...contents.filter(withText)]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
      if (out.length >= cap) break;
    }
    return out;
  }, [contents, getDueContents, settings.enableRecommendations, settings.recommendationCount]);

  const handleSessionPress = (contentId: string) => {
    void haptics.light();
    router.push(`/practice/listen/${contentId}`);
  };

  const handleBrowseLibrary = () => {
    void haptics.light();
    router.push('/(tabs)/library');
  };

  const continueContent = continueSession ? getContent(continueSession.contentId) : undefined;

  const continueContentId = continueSession?.contentId;
  const recommendedVisible = useMemo(() => {
    if (!continueContentId) return recommendedForListen;
    return recommendedForListen.filter((c) => c.id !== continueContentId);
  }, [recommendedForListen, continueContentId]);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Gradient Header */}
        <LinearGradient colors={listenColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="headphones" size={40} color={colors.onPrimary} />
            <Text style={[styles.title, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>Listen</Text>
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
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {continueSession && continueContent ? (
            <Animated.View entering={FadeInDown.delay(80)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                Continue where you left off
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.continueCard,
                  { backgroundColor: listenColors.primary },
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => handleSessionPress(continueSession.contentId)}
              >
                <View style={styles.continueCardText}>
                  <Text
                    style={[styles.continueTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
                    numberOfLines={2}
                  >
                    {continueContent.title}
                  </Text>
                  <Text style={[styles.continueMeta, { color: colors.onPrimary, opacity: 0.9 }]}>
                    Last session ·{' '}
                    {new Date(continueSession.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <MaterialCommunityIcons name="play-circle" size={40} color={colors.onPrimary} />
              </Pressable>
            </Animated.View>
          ) : null}

          {olderSessions.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(120)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                Recent Sessions
              </Text>
              {olderSessions.map((session) => {
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
                    <View style={[styles.sessionIcon, { backgroundColor: listenColors.background }]}>
                      <MaterialCommunityIcons name="headphones" size={20} color={listenColors.primary} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text
                        style={[styles.sessionTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                        numberOfLines={1}
                      >
                        {contentItem?.title || 'Untitled'}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                        {durationMin > 0 ? `${durationMin} min` : '<1 min'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="play-circle" size={28} color={listenColors.primary} />
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}

          {recentSessions.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <MaterialCommunityIcons name="headphones" size={64} color={colors.onSurfaceSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                Start Listening
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
                Choose content from your library to begin listening practice
              </Text>
            </Animated.View>
          ) : null}

          {recommendedVisible.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(160)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                {settings.enableRecommendations ? 'Recommended for listening' : 'Starred in your library'}
              </Text>
              {recommendedVisible.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.sessionCard,
                    { backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleSessionPress(item.id)}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: listenColors.background }]}>
                    <MaterialCommunityIcons name="headphones" size={20} color={listenColors.primary} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text
                      style={[styles.sessionTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                      {item.difficulty} · {item.language}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="play-circle" size={28} color={listenColors.primary} />
                </Pressable>
              ))}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
              Quick Start
            </Text>
            <Button
              mode="contained"
              onPress={handleBrowseLibrary}
              style={[styles.libraryButton, { backgroundColor: listenColors.primary }]}
              labelStyle={{ color: colors.onPrimary, fontFamily: fontFamily.bodyMedium }}
              icon="book-open-variant"
            >
              Browse Library
            </Button>
          </Animated.View>
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
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 8,
    borderCurve: 'continuous',
    gap: 12,
  },
  continueCardText: {
    flex: 1,
    minWidth: 0,
  },
  continueTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  continueMeta: {
    fontSize: 13,
    marginTop: 6,
    fontFamily: fontFamily.body,
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
