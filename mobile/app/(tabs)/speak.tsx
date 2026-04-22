import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { FreeConversationHero } from '@/components/speak/FreeConversationHero';
import { SpeakScenarioGrid } from '@/components/speak/SpeakScenarioGrid';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { haptics } from '@/lib/haptics';
import { BUILTIN_SCENARIOS, FREE_CONVERSATION_TOPICS } from '@/lib/scenarios';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSpeakStore } from '@/stores/useSpeakStore';
import { fontFamily } from '@/theme/typography';

export default function SpeakScreen() {
  const { colors, getModuleColors } = useAppTheme();
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
            <FreeConversationHero
              title={t('speak.freeConversation')}
              subtitle={t('speak.freeConversationSubtitle')}
              helperLabel={t('speak.suggestedTopics')}
              topics={FREE_CONVERSATION_TOPICS}
              onPress={() => handleOpenFreeConversation()}
              onTopicPress={handleOpenFreeConversation}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(110)}>
            <SpeakScenarioGrid
              title={tInterpolate('speak.scenariosCount', { count: BUILTIN_SCENARIOS.length })}
              scenarios={BUILTIN_SCENARIOS}
              onScenarioPress={handleOpenScenario}
            />
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
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
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
