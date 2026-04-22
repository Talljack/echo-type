import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/hooks/useI18n';
import { haptics } from '@/lib/haptics';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useListenStore } from '@/stores/useListenStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import type { Content } from '@/types/content';

type ListenTab = 'all' | 'wordbook' | 'phrase' | 'sentence' | 'article';

function isKnownWordbook(category: string | undefined) {
  return !!category && ALL_WORDBOOKS.some((book) => book.id === category);
}

function formatRelativeDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ListenScreen() {
  const { colors } = useAppTheme();
  const listenColors = moduleColors.listen;
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ListenTab>('all');
  const [query, setQuery] = useState('');

  const sessions = useListenStore((state) => state.sessions);
  const getContent = useLibraryStore((state) => state.getContent);
  const contents = useLibraryStore((state) => state.contents);

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 4),
    [sessions],
  );
  const continueSession = recentSessions[0];
  const continueContent = continueSession ? getContent(continueSession.contentId) : undefined;

  const listenableContents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return contents
      .filter((item) => Boolean(item.text?.trim()))
      .filter((item) => {
        if (activeTab === 'wordbook') return isKnownWordbook(item.category);
        if (activeTab === 'phrase' || activeTab === 'sentence' || activeTab === 'article')
          return item.type === activeTab;
        return ['word', 'phrase', 'sentence', 'article'].includes(item.type);
      })
      .filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.text.toLowerCase().includes(normalizedQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        );
      });
  }, [activeTab, contents, query]);

  const recentRows = useMemo(
    () =>
      recentSessions
        .map((session) => ({
          session,
          content: getContent(session.contentId),
        }))
        .filter((entry): entry is { session: (typeof recentSessions)[number]; content: Content } =>
          Boolean(entry.content),
        ),
    [getContent, recentSessions],
  );

  const tabOptions: Array<{ key: ListenTab; label: string }> = [
    { key: 'all', label: t('listen.allContent') },
    { key: 'wordbook', label: t('listen.wordbooks') },
    { key: 'phrase', label: 'Phrases' },
    { key: 'sentence', label: 'Sentences' },
    { key: 'article', label: 'Articles' },
  ];

  const handleOpenPractice = (contentId: string) => {
    void haptics.light();
    router.push(`/practice/listen/${contentId}`);
  };

  return (
    <Screen padding={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={listenColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <MaterialCommunityIcons name="headphones" size={28} color={colors.onPrimary} />
            </View>
            <Text style={[styles.title, { color: colors.onPrimary, fontFamily: fontFamily.headingBold }]}>
              {t('listen.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.onPrimary, fontFamily: fontFamily.body }]}>
              {t('listen.subtitle')}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {continueSession && continueContent ? (
            <Animated.View entering={FadeInDown.delay(60)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                {t('listen.continueLastSession')}
              </Text>
              <Pressable
                onPress={() => handleOpenPractice(continueSession.contentId)}
                style={({ pressed }) => [
                  styles.continueCard,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.continueIcon, { backgroundColor: listenColors.background }]}>
                  <MaterialCommunityIcons name="play-circle" size={28} color={listenColors.primary} />
                </View>
                <View style={styles.continueText}>
                  <Text style={[styles.continueTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                    {continueContent.title}
                  </Text>
                  <Text style={[styles.continueMeta, { color: colors.onSurfaceSecondary }]}>
                    {formatRelativeDate(continueSession.completedAt)} · {continueContent.difficulty}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          {recentRows.length > 1 ? (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                {t('listen.recentSessions')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
                {recentRows.slice(1).map(({ session, content }) => (
                  <Pressable
                    key={session.id}
                    onPress={() => handleOpenPractice(content.id)}
                    style={({ pressed }) => [
                      styles.recentCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Text
                      style={[styles.recentTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                      numberOfLines={2}
                    >
                      {content.title}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.onSurfaceSecondary }]}>
                      {formatRelativeDate(session.completedAt)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(140)}>
            <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
              {t('listen.practiceLibrary')}
            </Text>

            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('listen.searchPlaceholder')}
                placeholderTextColor={colors.onSurfaceSecondary}
                style={[styles.searchInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {tabOptions.map((tab) => {
                const selected = tab.key === activeTab;
                return (
                  <Chip
                    key={tab.key}
                    selected={selected}
                    onPress={() => {
                      void haptics.tap();
                      setActiveTab(tab.key);
                    }}
                    style={[
                      styles.tabChip,
                      {
                        backgroundColor: selected ? listenColors.primary : colors.surface,
                        borderColor: selected ? listenColors.primary : colors.borderLight,
                      },
                    ]}
                    textStyle={{
                      color: selected ? colors.onPrimary : colors.onSurface,
                      fontFamily: fontFamily.bodyMedium,
                    }}
                    compact
                  >
                    {tab.label}
                  </Chip>
                );
              })}
            </ScrollView>

            <View style={styles.listSection}>
              {listenableContents.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleOpenPractice(item.id)}
                  style={({ pressed }) => [
                    styles.contentRow,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: listenColors.background }]}>
                    <MaterialCommunityIcons name="headphones" size={20} color={listenColors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <View style={styles.rowTitleLine}>
                      <Text
                        style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={[styles.typePill, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.typePillText, { color: colors.primary }]}>{item.type}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rowPreview, { color: colors.onSurfaceSecondary }]} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.onSurfaceSecondary} />
                </Pressable>
              ))}

              {listenableContents.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                  <MaterialCommunityIcons name="playlist-remove" size={34} color={colors.onSurfaceSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                    {t('listen.emptyTitle')}
                  </Text>
                  <Text
                    style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}
                  >
                    {t('listen.emptyDescription')}
                  </Text>
                </View>
              ) : null}
            </View>
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
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  continueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    flex: 1,
  },
  continueTitle: {
    fontSize: 17,
  },
  continueMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  recentRow: {
    gap: 12,
  },
  recentCard: {
    width: 170,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recentTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  recentMeta: {
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 15,
  },
  tabsRow: {
    gap: 10,
    paddingBottom: 6,
  },
  tabChip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  listSection: {
    gap: 12,
    marginTop: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rowPreview: {
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
