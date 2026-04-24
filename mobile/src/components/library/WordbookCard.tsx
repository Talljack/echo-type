import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { fontFamily } from '@/theme/typography';
import type { WordBook } from '@/types/wordbook';
import { getWordBookItemCount } from '@/types/wordbook';

interface WordbookCardProps {
  book: WordBook;
  onPress: () => void;
  imported?: boolean;
  actionLabel?: string;
  actionLoading?: boolean;
  onActionPress?: () => void;
  secondaryLabel?: string;
  actionTone?: 'primary' | 'danger';
}

export function WordbookCard({
  book,
  onPress,
  imported = false,
  actionLabel,
  actionLoading = false,
  onActionPress,
  secondaryLabel,
  actionTone = 'primary',
}: WordbookCardProps) {
  const { colors } = useAppTheme();
  const difficultyAccent = {
    beginner: colors.success,
    intermediate: colors.warning,
    advanced: colors.error,
  } as const;
  const count = getWordBookItemCount(book);
  const actionColor = actionTone === 'danger' ? colors.error : colors.primary;
  const actionBg = actionTone === 'danger' ? `${colors.error}12` : `${colors.primary}12`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => {
        void haptics.light();
        onPress();
      }}
    >
      <Text style={styles.emoji}>{book.emoji}</Text>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={[styles.name, { color: colors.onSurface, fontFamily: fontFamily.heading }]} numberOfLines={1}>
              {book.nameEn}
            </Text>
            <Text style={[styles.nameEn, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
              {secondaryLabel ?? book.filterTag}
            </Text>
          </View>
          {imported ? <View style={[styles.importedDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <View style={styles.meta}>
          <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyAccent[book.difficulty]}20` }]}>
            <Text style={[styles.difficultyText, { color: difficultyAccent[book.difficulty] }]}>{book.difficulty}</Text>
          </View>
          <Text style={[styles.count, { color: colors.onSurfaceSecondary }]}>{count} words</Text>
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              if (actionLoading) return;
              void haptics.light();
              onActionPress();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: actionBg },
              pressed && !actionLoading && { opacity: 0.72 },
            ]}
          >
            <Text style={[styles.actionText, { color: actionColor }]}>{actionLoading ? 'Working…' : actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderCurve: 'continuous',
  },
  emoji: {
    fontSize: 36,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleCopy: {
    flex: 1,
  },
  importedDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  nameEn: {
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  count: {
    fontSize: 12,
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
