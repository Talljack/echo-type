import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { haptics } from '@/lib/haptics';
import { BUILTIN_SCENARIOS, FREE_CONVERSATION_TOPICS, getCategoryCardGradient } from '@/lib/scenarios';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { fontFamily } from '@/theme/typography';

function difficultyBadgeStyle(difficulty: 'beginner' | 'intermediate' | 'advanced') {
  switch (difficulty) {
    case 'beginner':
      return { bg: 'rgba(255,255,255,0.22)', border: 'rgba(255,255,255,0.45)' };
    case 'intermediate':
      return { bg: 'rgba(255,255,255,0.18)', border: 'rgba(255,255,255,0.4)' };
    case 'advanced':
      return { bg: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.38)' };
    default:
      return { bg: 'rgba(255,255,255,0.2)', border: 'rgba(255,255,255,0.35)' };
  }
}

export default function SpeakScreen() {
  const { colors, isDark, getModuleColors } = useAppTheme();
  const speakColors = getModuleColors('speak');
  const insets = useSafeAreaInsets();
  const { t, tInterpolate } = useI18n();

  const sessions = useSpeakStore((state) => state.sessions);
  const getContent = useLibraryStore((state) => state.getContent);

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 4),
    [sessions],
  );

  const handleOpenFreeConversation = (topic?: string) => {
    void haptics.medium();
    if (topic) {
      router.push({ pathname: '/practice/speak/conversation', params: { topic } });
      return;
    }
    router.push('/practice/speak/conversation');
  };

  const handleOpenScenario = (scenarioId: string) => {
    void haptics.medium();
    router.push({ pathname: '/practice/speak/conversation', params: { scenarioId } });
  };

  const handleOpenRecentSession = (session: (typeof recentSessions)[number]) => {
    void haptics.light();
    if (session.route?.type === 'scenario' && session.route.scenarioId) {
      router.push({ pathname: '/practice/speak/conversation', params: { scenarioId: session.route.scenarioId } });
      return;
    }
    if (session.route?.type === 'free') {
      router.push({
        pathname: '/practice/speak/conversation',
        params: {
          topic: session.route.topic,
          restart: String(Date.now()),
        },
      });
      return;
    }
    if (session.route?.type === 'content' && session.route.contentId) {
      router.push({
        pathname: '/practice/speak/conversation',
        params: { contentId: session.route.contentId },
      });
      return;
    }
    router.push({
      pathname: '/practice/speak/conversation',
      params: { contentId: session.contentId },
    });
  };

  return (
    <Screen padding={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={speakColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <MaterialCommunityIcons name="forum" size={28} color={colors.onPrimary} />
            </View>
            <Text style={[styles.title, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>
              {t('speak.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.onPrimary, fontFamily: fontFamily.body }]}>
              {t('speak.subtitle')}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(60)}>
            <Pressable
              style={({ pressed }) => [styles.freeHeroWrap, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
              onPress={() => handleOpenFreeConversation()}
            >
              <LinearGradient
                colors={speakColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.freeHeroCard}
              >
                <View style={styles.freeHeroRow}>
                  <View style={[styles.freeHeroIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                    <MaterialCommunityIcons name="microphone-message" size={28} color={colors.onPrimary} />
                  </View>
                  <View style={styles.freeHeroText}>
                    <Text
                      style={[styles.freeHeroTitle, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}
                    >
                      {t('speak.freeConversation')}
                    </Text>
                    <Text style={[styles.freeHeroSubtitle, { color: colors.onPrimary }]}>
                      {t('speak.freeConversationSubtitle')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={26} color={colors.onPrimary} />
                </View>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.helperLabel, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium }]}>
              {t('speak.suggestedTopics')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsRow}>
              {FREE_CONVERSATION_TOPICS.map((topic) => (
                <Pressable
                  key={topic}
                  onPress={() => handleOpenFreeConversation(topic)}
                  style={({ pressed }) => [
                    styles.topicChip,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.topicChipText, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}>
                    {topic}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(110)}>
            <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
              {tInterpolate('speak.scenariosCount', { count: BUILTIN_SCENARIOS.length })}
            </Text>

            <View style={styles.grid}>
              {BUILTIN_SCENARIOS.map((scenario, index) => {
                const badge = difficultyBadgeStyle(scenario.difficulty);
                const gradient = getCategoryCardGradient(scenario.category, isDark);

                return (
                  <Animated.View key={scenario.id} entering={FadeInDown.delay(140 + index * 25)}>
                    <Pressable
                      onPress={() => handleOpenScenario(scenario.id)}
                      style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
                    >
                      <LinearGradient colors={gradient} style={styles.scenarioCard}>
                        <View style={styles.scenarioTop}>
                          <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
                          <View
                            style={[styles.difficultyPill, { backgroundColor: badge.bg, borderColor: badge.border }]}
                          >
                            <Text
                              style={[
                                styles.difficultyPillText,
                                { color: colors.onPrimary, fontFamily: fontFamily.bodyMedium },
                              ]}
                            >
                              {scenario.difficulty}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.scenarioTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
                          numberOfLines={2}
                        >
                          {scenario.title}
                        </Text>
                        <Text
                          style={[styles.scenarioDesc, { color: 'rgba(255,255,255,0.9)', fontFamily: fontFamily.body }]}
                          numberOfLines={3}
                        >
                          {scenario.description}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {recentSessions.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(220)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                {t('speak.recentSessions')}
              </Text>
              <View style={styles.recentList}>
                {recentSessions.map((session) => {
                  const content = getContent(session.contentId);
                  const title = session.title ?? content?.title ?? t('speak.untitled');
                  return (
                    <Pressable
                      key={session.id}
                      onPress={() => handleOpenRecentSession(session)}
                      style={({ pressed }) => [
                        styles.recentCard,
                        { backgroundColor: colors.surface, borderColor: colors.borderLight },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={[styles.recentIcon, { backgroundColor: speakColors.background }]}>
                        <MaterialCommunityIcons name="history" size={18} color={speakColors.primary} />
                      </View>
                      <View style={styles.recentText}>
                        <Text
                          style={[styles.recentTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                          numberOfLines={1}
                        >
                          {title}
                        </Text>
                        <Text style={[styles.recentMeta, { color: colors.onSurfaceSecondary }]}>
                          {Math.round(session.score)}% ·{' '}
                          {new Date(session.completedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
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
    alignItems: 'flex-start',
    gap: 10,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
    maxWidth: 300,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 22,
  },
  freeHeroWrap: {
    marginBottom: 14,
  },
  freeHeroCard: {
    borderRadius: 24,
    padding: 20,
  },
  freeHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  freeHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeHeroText: {
    flex: 1,
  },
  freeHeroTitle: {
    fontSize: 22,
    marginBottom: 4,
  },
  freeHeroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  helperLabel: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  topicsRow: {
    gap: 10,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topicChipText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  scenarioCard: {
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  scenarioTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scenarioEmoji: {
    fontSize: 24,
  },
  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  difficultyPillText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  scenarioTitle: {
    fontSize: 18,
  },
  scenarioDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  recentList: {
    gap: 12,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  recentMeta: {
    fontSize: 12,
  },
});
