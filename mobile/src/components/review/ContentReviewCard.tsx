import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { previewRatings, Rating, State } from '@/lib/fsrs';
import { darkColors, lightColors } from '@/theme/colors';
import type { Content } from '@/types/content';

interface ContentReviewCardProps {
  content: Content;
  onRate: (rating: Rating) => void;
}

const PREVIEW_LEN = 280;

type AppPalette = typeof lightColors;

function difficultyStyle(
  difficulty: Content['difficulty'],
  colors: AppPalette | typeof darkColors,
): {
  bg: string;
  fg: string;
} {
  switch (difficulty) {
    case 'beginner':
      return { bg: colors.successLight, fg: colors.success };
    case 'intermediate':
      return { bg: colors.warningLight, fg: colors.warning };
    case 'advanced':
      return { bg: colors.primaryContainer, fg: colors.primary };
    default:
      return { bg: colors.surfaceVariant, fg: colors.onSurfaceVariant };
  }
}

export function ContentReviewCard({ content, onRate }: ContentReviewCardProps) {
  const { colors, isDark, getModuleColors } = useAppTheme();
  const [showActions, setShowActions] = useState(false);
  const listen = getModuleColors('listen');
  const read = getModuleColors('read');
  const write = getModuleColors('write');

  const body = content.text || content.content;
  const preview = useMemo(() => {
    const t = body.trim();
    if (t.length <= PREVIEW_LEN) return t;
    return `${t.slice(0, PREVIEW_LEN)}…`;
  }, [body]);

  const intervals = previewRatings(content.fsrsCard, new Date());
  const diffStyle = difficultyStyle(content.difficulty, colors);
  const dividerColor = isDark ? '#2C2C2E' : '#E5E7EB';

  const ratingButtons: { rating: Rating; label: string; color: string; interval: string }[] = [
    { rating: Rating.Again, label: 'Again', color: colors.error, interval: intervals[Rating.Again].interval },
    { rating: Rating.Hard, label: 'Hard', color: colors.warning, interval: intervals[Rating.Hard].interval },
    { rating: Rating.Good, label: 'Good', color: colors.success, interval: intervals[Rating.Good].interval },
    { rating: Rating.Easy, label: 'Easy', color: colors.primary, interval: intervals[Rating.Easy].interval },
  ];

  const openPractice = (module: 'listen' | 'read' | 'write') => {
    void Haptics.selectionAsync();
    if (module === 'listen') router.push(`/practice/listen/${content.id}`);
    else if (module === 'read') router.push(`/practice/read/${content.id}`);
    else router.push(`/practice/write/${content.id}`);
  };

  return (
    <View style={styles.outer}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="labelSmall" style={[styles.kindLabel, { color: colors.onSurfaceSecondary }]}>
            LIBRARY CONTENT
          </Text>
          <Text variant="titleLarge" style={[styles.title, { color: colors.onSurface }]}>
            {content.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: diffStyle.bg }]}>
              <Text variant="labelSmall" style={[styles.badgeText, { color: diffStyle.fg }]}>
                {content.difficulty}
              </Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: colors.primary, textTransform: 'capitalize' }}>
                {content.type}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <Text variant="bodyMedium" style={[styles.prompt, { color: colors.onSurfaceVariant }]}>
            Practice with Listen, Read aloud, or Write — then rate here. Or rate now if you already know this item well.
          </Text>
          <Text variant="bodyMedium" style={[styles.preview, { color: colors.onSurface }]}>
            {preview}
          </Text>

          <View style={styles.practiceRow}>
            <TouchableOpacity
              style={[styles.practiceBtn, { backgroundColor: colors.surfaceVariant, borderColor: listen.primary }]}
              onPress={() => openPractice('listen')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="headphones" size={22} color={listen.primary} />
              <Text variant="labelMedium" style={{ color: listen.primary, marginTop: 4 }}>
                Listen
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.practiceBtn, { backgroundColor: colors.surfaceVariant, borderColor: read.primary }]}
              onPress={() => openPractice('read')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="microphone" size={22} color={read.primary} />
              <Text variant="labelMedium" style={{ color: read.primary, marginTop: 4 }}>
                Read
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.practiceBtn, { backgroundColor: colors.surfaceVariant, borderColor: write.primary }]}
              onPress={() => openPractice('write')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="keyboard-outline" size={22} color={write.primary} />
              <Text variant="labelMedium" style={{ color: write.primary, marginTop: 4 }}>
                Write
              </Text>
            </TouchableOpacity>
          </View>

          {!showActions ? (
            <TouchableOpacity
              style={[styles.showButton, { backgroundColor: colors.primaryContainer }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowActions(true);
              }}
              activeOpacity={0.7}
            >
              <Text variant="bodyLarge" style={[styles.showButtonText, { color: colors.primary }]}>
                Rate retention
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text variant="labelSmall" style={[styles.fsrsHint, { color: colors.onSurfaceSecondary }]}>
                {content.fsrsCard?.state === State.New ? 'NEW' : `Review #${content.fsrsCard?.reps ?? 0}`}
              </Text>
              <View style={styles.ratingContainer}>
                {ratingButtons.map((btn) => (
                  <TouchableOpacity
                    key={btn.rating}
                    style={[styles.ratingButton, { borderColor: btn.color, backgroundColor: colors.surface }]}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onRate(btn.rating);
                      setShowActions(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text variant="labelLarge" style={[styles.ratingLabel, { color: btn.color }]}>
                      {btn.label}
                    </Text>
                    <Text variant="labelSmall" style={[styles.ratingInterval, { color: colors.onSurfaceSecondary }]}>
                      {btn.interval}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  kindLabel: {
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  title: {
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  prompt: {
    marginBottom: 10,
    lineHeight: 20,
  },
  preview: {
    lineHeight: 22,
    marginBottom: 16,
  },
  practiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  practiceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  showButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  showButtonText: {
    fontWeight: '600',
  },
  fsrsHint: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingButton: {
    flexGrow: 1,
    minWidth: '22%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  ratingLabel: {
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingInterval: {
    fontSize: 10,
    textAlign: 'center',
  },
});
