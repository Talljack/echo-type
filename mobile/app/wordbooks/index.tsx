import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WordbookCard } from '@/components/library/WordbookCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useWordbookStore } from '@/stores/useWordbookStore';
import { fontFamily } from '@/theme/typography';

type Tab = 'vocabulary' | 'scenarios';

const VOCAB_FILTERS = [
  'All',
  'School',
  'Textbook',
  'College',
  'Graduate',
  'Domestic Exam',
  'Study Abroad',
  'Cambridge',
  'Core Vocabulary',
  'Professional',
  'Tech',
  'General',
  'Academic',
] as const;

const SCENARIO_FILTERS = [
  'All',
  'Travel',
  'Food & Drink',
  'Daily Life',
  'Business',
  'Health',
  'Social',
  'Emergency',
] as const;

export default function WordbooksScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabColors = getModuleColors('vocabulary');
  const insets = useSafeAreaInsets();
  const { importedIds, loadImportedState, importWordbook, removeWordbook, isImported } = useWordbookStore();
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');
  const [vocabFilter, setVocabFilter] = useState<(typeof VOCAB_FILTERS)[number]>('All');
  const [scenarioFilter, setScenarioFilter] = useState<(typeof SCENARIO_FILTERS)[number]>('All');
  const [actionBookId, setActionBookId] = useState<string | null>(null);

  useEffect(() => {
    void loadImportedState();
  }, [loadImportedState]);

  const allVocabulary = useMemo(() => ALL_WORDBOOKS.filter((book) => book.kind === 'vocabulary'), []);
  const allScenarios = useMemo(() => ALL_WORDBOOKS.filter((book) => book.kind === 'scenario'), []);

  const displayedBooks = useMemo(() => {
    if (activeTab === 'vocabulary') {
      return vocabFilter === 'All' ? allVocabulary : allVocabulary.filter((book) => book.filterTag === vocabFilter);
    }
    return scenarioFilter === 'All' ? allScenarios : allScenarios.filter((book) => book.filterTag === scenarioFilter);
  }, [activeTab, allScenarios, allVocabulary, scenarioFilter, vocabFilter]);

  const activeFilter = activeTab === 'vocabulary' ? vocabFilter : scenarioFilter;

  const handleAction = async (bookId: string) => {
    setActionBookId(bookId);
    try {
      if (isImported(bookId)) {
        await removeWordbook(bookId);
      } else {
        await importWordbook(bookId);
      }
    } finally {
      setActionBookId(null);
    }
  };

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
              {ALL_WORDBOOKS.length} books available · {importedIds.size} imported
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Button
            compact
            mode="contained-tonal"
            buttonColor="rgba(255,255,255,0.16)"
            textColor={colors.onPrimary}
            onPress={() => router.push('/(tabs)/library' as Href)}
          >
            View Library
          </Button>
        </View>
      </LinearGradient>

      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab('vocabulary')}
          style={[
            styles.tabPill,
            { backgroundColor: activeTab === 'vocabulary' ? colors.surface : colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={18}
            color={activeTab === 'vocabulary' ? vocabColors.primary : colors.onSurfaceSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'vocabulary' ? colors.onSurface : colors.onSurfaceSecondary },
            ]}
          >
            Vocabulary
          </Text>
          <Text
            style={[
              styles.tabCount,
              { color: activeTab === 'vocabulary' ? vocabColors.primary : colors.onSurfaceSecondary },
            ]}
          >
            {allVocabulary.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('scenarios')}
          style={[
            styles.tabPill,
            { backgroundColor: activeTab === 'scenarios' ? colors.surface : colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="layers-outline"
            size={18}
            color={activeTab === 'scenarios' ? vocabColors.primary : colors.onSurfaceSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'scenarios' ? colors.onSurface : colors.onSurfaceSecondary },
            ]}
          >
            Scenarios
          </Text>
          <Text
            style={[
              styles.tabCount,
              { color: activeTab === 'scenarios' ? vocabColors.primary : colors.onSurfaceSecondary },
            ]}
          >
            {allScenarios.length}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(activeTab === 'vocabulary' ? VOCAB_FILTERS : SCENARIO_FILTERS).map((filter) => (
            <Chip
              key={filter}
              mode={activeFilter === filter ? 'flat' : 'outlined'}
              selected={activeFilter === filter}
              onPress={() =>
                activeTab === 'vocabulary'
                  ? setVocabFilter(filter as (typeof VOCAB_FILTERS)[number])
                  : setScenarioFilter(filter as (typeof SCENARIO_FILTERS)[number])
              }
              style={[styles.chip, activeFilter === filter && { backgroundColor: vocabColors.primary }]}
              textStyle={activeFilter === filter ? { color: colors.onPrimary } : { color: colors.onSurface }}
            >
              {filter}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <View style={styles.countRow}>
        <Text style={[styles.countLabel, { color: colors.onSurfaceSecondary }]}>
          {displayedBooks.length} {displayedBooks.length === 1 ? 'book' : 'books'} in “{activeFilter}”
        </Text>
      </View>

      <FlatList
        data={displayedBooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WordbookCard
            book={item}
            imported={isImported(item.id)}
            secondaryLabel={item.filterTag}
            actionLabel={isImported(item.id) ? 'Remove' : 'Add to Library'}
            actionTone={isImported(item.id) ? 'danger' : 'primary'}
            actionLoading={actionBookId === item.id}
            onActionPress={() => void handleAction(item.id)}
            onPress={() => router.push(`/wordbook/${item.id}` as Href)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="book-search-outline" size={28} color={colors.onSurfaceSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No wordbooks match this filter</Text>
            <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
              Try another category or switch between Vocabulary and Scenarios.
            </Text>
          </View>
        }
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
  headerActions: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  chip: {
    marginRight: 8,
  },
  countRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  countLabel: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
});
