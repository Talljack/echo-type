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
import { useReadStore } from '@/stores/useReadStore';
import { moduleColors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export default function ReadScreen() {
  const { colors } = useAppTheme();
  const readColors = moduleColors.read;
  const sessions = useReadStore((state) => state.sessions);
  const getTotalReadTime = useReadStore((state) => state.getTotalReadTime);
  const getTotalWordsRead = useReadStore((state) => state.getTotalWordsRead);
  const getContent = useLibraryStore((state) => state.getContent);
  const insets = useSafeAreaInsets();

  const totalMinutes = Math.floor(getTotalReadTime() / 60);
  const totalWords = getTotalWordsRead();

  const recentSessions = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 10);

  const handleSessionPress = (contentId: string) => {
    void haptics.light();
    router.push(`/practice/read/${contentId}`);
  };

  const handleBrowseLibrary = () => {
    void haptics.light();
    router.push('/(tabs)/library?mode=read');
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={readColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="book-open-variant" size={40} color="#FFFFFF" />
            <Text style={[styles.title, { color: '#FFFFFF', fontFamily: fontFamily.headingBold }]}>Read</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalMinutes}</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>minutes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{sessions.length}</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>sessions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{totalWords}</Text>
                <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>words</Text>
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
                      <View style={[styles.sessionIcon, { backgroundColor: readColors.background }]}>
                        <MaterialCommunityIcons name="book-open-variant" size={20} color={readColors.primary} />
                      </View>
                      <View style={styles.sessionInfo}>
                        <Text
                          style={[styles.sessionTitle, { color: colors.onSurface, fontFamily: fontFamily.bodyMedium }]}
                          numberOfLines={1}
                        >
                          {contentItem?.title || 'Untitled'}
                        </Text>
                        <Text style={[styles.sessionMeta, { color: colors.onSurfaceSecondary }]}>
                          {durationMin > 0 ? `${durationMin} min` : '<1 min'} · {session.wordsRead} words
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="play-circle" size={28} color={readColors.primary} />
                    </Pressable>
                  );
                })}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200)}>
                <Text style={[styles.sectionTitle, { color: colors.onBackground, fontFamily: fontFamily.heading }]}>
                  Quick Start
                </Text>
                <Button
                  mode="contained"
                  onPress={handleBrowseLibrary}
                  style={[styles.libraryButton, { backgroundColor: readColors.primary }]}
                  labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                  icon="book-open-variant"
                >
                  Browse Library
                </Button>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-variant" size={64} color={colors.onSurfaceSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                Start Reading
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary, fontFamily: fontFamily.body }]}>
                Shadow reading with speech recognition feedback — practice pronunciation as you read aloud
              </Text>
              <Button
                mode="contained"
                onPress={handleBrowseLibrary}
                style={[styles.libraryButton, { backgroundColor: readColors.primary }]}
                labelStyle={{ color: '#FFFFFF', fontFamily: fontFamily.bodyMedium }}
                icon="book-open-variant"
              >
                Choose from Library
              </Button>
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
