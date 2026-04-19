import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { haptics } from '@/lib/haptics';
import {
  BUILTIN_SCENARIOS,
  FREE_CONVERSATION_TOPICS,
  getCategoryCardGradient,
  groupScenariosByCategory,
} from '@/lib/scenarios';
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
  const sessions = useSpeakStore((state) => state.sessions);
  const getTotalSpeakTime = useSpeakStore((state) => state.getTotalSpeakTime);
  const getAverageScore = useSpeakStore((state) => state.getAverageScore);
  const getContent = useLibraryStore((state) => state.getContent);
  const insets = useSafeAreaInsets();
  const { t, tInterpolate } = useI18n();

  const totalMinutes = Math.floor(getTotalSpeakTime() / 60);
  const avgScore = getAverageScore();
  const recentSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 10);
  const scenarioSections = groupScenariosByCategory();

  const handleSessionPress = (contentId: string) => {
    void haptics.light();
    router.push(`/practice/speak/${contentId}` as any);
  };

  const handleBrowseLibrary = () => {
    void haptics.light();
    router.push('/(tabs)/library');
  };

  const goFreeConversation = (topic?: string) => {
    void haptics.medium();
    if (topic) {
      router.push({
        pathname: '/practice/speak/conversation',
        params: { topic },
      });
    } else {
      router.push('/practice/speak/conversation');
    }
  };

  const goScenario = (scenarioId: string) => {
    void haptics.medium();
    router.push({
      pathname: '/practice/speak/conversation',
      params: { scenarioId },
    });
  };

  let scenarioAnimIndex = 0;

  return (
    <Screen scrollable>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={speakColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="microphone" size={40} color={colors.onPrimary} />
            <Text style={[styles.title, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>
              {t('speak.title')}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{totalMinutes}</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>{t('speak.minutes')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{sessions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>{t('speak.sessions')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.onPrimary }]}>{avgScore}%</Text>
                <Text style={[styles.statLabel, { color: colors.onPrimary }]}>{t('speak.avgScore')}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Pressable
              style={({ pressed }) => [styles.freeHeroCard, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
              onPress={() => goFreeConversation()}
            >
              <LinearGradient
                colors={[speakColors.primary, speakColors.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.freeHeroGradient}
              >
                <View style={styles.freeHeroRow}>
                  <View style={[styles.freeHeroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialCommunityIcons name="forum" size={28} color={colors.onPrimary} />
                  </View>
                  <View style={styles.freeHeroTextCol}>
                    <Text
                      style={[styles.freeHeroTitle, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}
                    >
                      Free conversation
                    </Text>
                    <Text style={[styles.freeHeroSubtitle, { color: colors.onPrimary }]}>
                      Type or speak — pick a topic or go open-ended
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={28} color={colors.onPrimary} />
                </View>
              </LinearGradient>
            </Pressable>

            <Text
              style={[
                styles.chipsSectionLabel,
                { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodyMedium },
              ]}
            >
              {t('speak.suggestedTopics')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicChipsRow}>
              {FREE_CONVERSATION_TOPICS.map((topic) => (
                <Pressable
                  key={topic}
                  onPress={() => goFreeConversation(topic)}
                  style={({ pressed }) => [
                    styles.topicChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.topicChipText, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}>
                    {topic}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
            {tInterpolate('speak.scenariosCount', { count: BUILTIN_SCENARIOS.length })}
          </Text>

          {scenarioSections.map((section) => (
            <View key={section.category} style={styles.categoryBlock}>
              <Text
                style={[
                  styles.categoryHeader,
                  { color: colors.onSurfaceSecondary, fontFamily: fontFamily.bodySemiBold },
                ]}
              >
                {section.category}
              </Text>
              {section.data.map((s) => {
                const delay = 120 + scenarioAnimIndex * 45;
                scenarioAnimIndex += 1;
                const grad = getCategoryCardGradient(s.category, isDark);
                const badge = difficultyBadgeStyle(s.difficulty);
                return (
                  <Animated.View key={s.id} entering={FadeInDown.delay(delay).springify()}>
                    <Pressable
                      style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
                      onPress={() => goScenario(s.id)}
                    >
                      <LinearGradient
                        colors={grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.scenarioCard}
                      >
                        <View style={styles.scenarioCardTop}>
                          <Text style={styles.scenarioEmoji}>{s.emoji}</Text>
                          <View
                            style={[styles.difficultyPill, { backgroundColor: badge.bg, borderColor: badge.border }]}
                          >
                            <Text
                              style={[
                                styles.difficultyPillText,
                                { color: '#FFFFFF', fontFamily: fontFamily.bodyMedium },
                              ]}
                            >
                              {s.difficulty}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.scenarioTitle, { color: '#FFFFFF', fontFamily: fontFamily.heading }]}
                          numberOfLines={2}
                        >
                          {s.title}
                        </Text>
                        <Text
                          style={[
                            styles.scenarioDesc,
                            { color: 'rgba(255,255,255,0.88)', fontFamily: fontFamily.body },
                          ]}
                          numberOfLines={2}
                        >
                          {s.description}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ))}

          {recentSessions.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(280)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                {t('speak.recentSessions')}
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
                        {contentItem?.title || t('speak.untitled')}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                        {durationMin > 0 ? `${durationMin}m` : '<1m'} • {t('speak.scoreLabel')}: {session.score ?? '--'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="play-circle" size={28} color={speakColors.primary} />
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(320)}>
            <Button
              mode="contained"
              onPress={handleBrowseLibrary}
              style={[styles.libraryButton, { backgroundColor: speakColors.primary }]}
              labelStyle={{ color: colors.onPrimary, fontFamily: fontFamily.bodyMedium }}
              icon="book-open-variant"
            >
              {recentSessions.length > 0 ? t('speak.browseLibrary') : t('speak.chooseFromLibrary')}
            </Button>
          </Animated.View>
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
  freeHeroCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
    borderCurve: 'continuous',
  },
  freeHeroGradient: {
    borderRadius: 22,
    padding: 18,
    borderCurve: 'continuous',
  },
  freeHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  freeHeroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  freeHeroTextCol: {
    flex: 1,
  },
  freeHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  freeHeroSubtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.92,
    fontWeight: '500',
  },
  chipsSectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  topicChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  topicChipText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
  },
  categoryBlock: {
    marginBottom: 4,
  },
  categoryHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  scenarioCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderCurve: 'continuous',
  },
  scenarioCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioEmoji: {
    fontSize: 28,
  },
  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  difficultyPillText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  scenarioTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  scenarioDesc: {
    fontSize: 14,
    lineHeight: 20,
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
    marginTop: 16,
    borderCurve: 'continuous',
  },
});
