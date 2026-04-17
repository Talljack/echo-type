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
}

export function WordbookCard({ book, onPress }: WordbookCardProps) {
  const { colors } = useAppTheme();
  const difficultyAccent = {
    beginner: colors.success,
    intermediate: colors.warning,
    advanced: colors.error,
  } as const;
  const count = getWordBookItemCount(book);

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
        <Text style={[styles.name, { color: colors.onSurface, fontFamily: fontFamily.heading }]} numberOfLines={1}>
          {book.name}
        </Text>
        <Text style={[styles.nameEn, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
          {book.nameEn}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyAccent[book.difficulty]}20` }]}>
            <Text style={[styles.difficultyText, { color: difficultyAccent[book.difficulty] }]}>{book.difficulty}</Text>
          </View>
          <Text style={[styles.count, { color: colors.onSurfaceSecondary }]}>{count} words</Text>
        </View>
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
});
