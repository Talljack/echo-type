import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WordbookCard } from '@/components/library/WordbookCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { fontFamily } from '@/theme/typography';

type DifficultyFilter = '' | 'beginner' | 'intermediate' | 'advanced';
type KindFilter = '' | 'vocabulary' | 'scenario';

export default function WordbooksScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabColors = getModuleColors('vocabulary');
  const insets = useSafeAreaInsets();

  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('');

  const filteredBooks = ALL_WORDBOOKS.filter((book) => {
    if (difficultyFilter && book.difficulty !== difficultyFilter) return false;
    if (kindFilter && book.kind !== kindFilter) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={vocabColors.gradient} style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onPrimary} />
          </Pressable>
          <View>
            <Text style={[styles.headerTitle, { fontFamily: fontFamily.headingBold, color: colors.onPrimary }]}>
              Wordbooks
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.onPrimary }]}>
              {ALL_WORDBOOKS.length} books available
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['', 'vocabulary', 'scenario'] as KindFilter[]).map((kind) => (
            <Chip
              key={kind || 'all-kind'}
              mode={kindFilter === kind ? 'flat' : 'outlined'}
              selected={kindFilter === kind}
              onPress={() => setKindFilter(kind)}
              style={[styles.chip, kindFilter === kind && { backgroundColor: vocabColors.primary }]}
              textStyle={kindFilter === kind ? { color: colors.onPrimary } : { color: colors.onSurface }}
            >
              {kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'All Types'}
            </Chip>
          ))}
          {(['', 'beginner', 'intermediate', 'advanced'] as DifficultyFilter[]).map((diff) => (
            <Chip
              key={diff || 'all-diff'}
              mode={difficultyFilter === diff ? 'flat' : 'outlined'}
              selected={difficultyFilter === diff}
              onPress={() => setDifficultyFilter(diff)}
              style={[styles.chip, difficultyFilter === diff && { backgroundColor: vocabColors.primary }]}
              textStyle={difficultyFilter === diff ? { color: colors.onPrimary } : { color: colors.onSurface }}
            >
              {diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : 'All Levels'}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WordbookCard book={item} onPress={() => router.push(`/wordbook/${item.id}` as Href)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    marginRight: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
