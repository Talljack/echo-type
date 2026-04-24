import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Chip, Searchbar, Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { ALL_WORDBOOKS, getWordBook, loadWordBookItems } from '@/lib/wordbooks';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useWordbookStore } from '@/stores/useWordbookStore';
import { fontFamily } from '@/theme/typography';
import { getWordBookItemCount, type WordBook, type WordItem } from '@/types/wordbook';

function getRelatedBooks(book: WordBook, limit = 4): WordBook[] {
  return ALL_WORDBOOKS.filter((candidate) => candidate.id !== book.id && candidate.kind === book.kind)
    .map((candidate) => {
      let score = 0;
      if (candidate.filterTag === book.filterTag) score += 3;
      if (candidate.difficulty === book.difficulty) score += 2;
      score += candidate.tags.filter((tag) => book.tags.includes(tag)).length;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export default function WordbookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, getModuleColors } = useAppTheme();
  const vocabColors = getModuleColors('vocabulary');
  const contents = useLibraryStore((state) => state.contents);
  const { loadImportedState, importWordbook, removeWordbook, isImported } = useWordbookStore();

  const book = id ? getWordBook(id) : undefined;
  const bookName = book?.nameEn ?? '';
  const [items, setItems] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');

  const imported = id ? isImported(id) : false;
  const relatedBooks = useMemo(() => (book ? getRelatedBooks(book) : []), [book]);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query));
  }, [items, search]);

  const ensurePracticeContent = async () => {
    if (!id) return null;
    const existing = useLibraryStore.getState().contents.find((item) => item.category === id);
    if (existing) return existing;
    setActionLoading(true);
    try {
      await importWordbook(id);
      return useLibraryStore.getState().contents.find((item) => item.category === id) ?? null;
    } finally {
      setActionLoading(false);
    }
  };

  const openPractice = async (mode: 'listen' | 'speak' | 'read' | 'write') => {
    const content = await ensurePracticeContent();
    if (!content) return;
    if (mode === 'speak') {
      router.push({
        pathname: '/practice/speak/conversation',
        params: { contentId: content.id, topic: bookName },
      });
      return;
    }
    router.push(`/practice/${mode}/${content.id}`);
  };

  useEffect(() => {
    void loadImportedState();
  }, [loadImportedState]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      loadWordBookItems(id).then((loaded) => {
        setItems(loaded);
        setLoading(false);
      });
    }
  }, [id]);

  if (!book) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text variant="headlineSmall" style={{ color: colors.onSurface, padding: 20 }}>
          Wordbook not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={vocabColors.gradient} style={styles.headerGradient}>
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => router.back()} color={colors.onPrimary} />
          <Appbar.Content
            title={book.name}
            titleStyle={[styles.headerTitle, { color: colors.onPrimary, fontFamily: fontFamily.heading }]}
          />
        </Appbar.Header>
        <View style={styles.headerInfo}>
          <Text style={styles.headerEmoji}>{book.emoji}</Text>
          <Text style={[styles.headerDesc, { color: colors.onPrimary, fontFamily: fontFamily.body }]}>
            {book.description}
          </Text>
          <View style={styles.headerMeta}>
            <Chip style={styles.headerChip} textStyle={[styles.headerChipText, { color: colors.onPrimary }]}>
              {book.filterTag}
            </Chip>
            <Chip style={styles.headerChip} textStyle={[styles.headerChipText, { color: colors.onPrimary }]}>
              {book.difficulty}
            </Chip>
            <Text style={[styles.headerCount, { color: colors.onPrimary }]}>{getWordBookItemCount(book)} items</Text>
          </View>
          <View style={styles.headerActionRow}>
            <Button
              compact
              mode={imported ? 'outlined' : 'contained-tonal'}
              onPress={() => {
                if (!id || actionLoading) return;
                setActionLoading(true);
                const task = imported ? removeWordbook(id) : importWordbook(id);
                void task.finally(() => setActionLoading(false));
              }}
              buttonColor={imported ? undefined : 'rgba(255,255,255,0.16)'}
              textColor={colors.onPrimary}
              style={[styles.headerButton, imported && { borderColor: 'rgba(255,255,255,0.35)' }]}
            >
              {actionLoading ? 'Working…' : imported ? 'Remove from Library' : 'Add to Library'}
            </Button>
            <Button compact mode="text" textColor={colors.onPrimary} onPress={() => router.push('/(tabs)/library')}>
              View Library
            </Button>
          </View>
          <View style={styles.practiceActions}>
            <Button
              compact
              mode="contained-tonal"
              disabled={actionLoading}
              onPress={() => void openPractice('listen')}
              style={styles.practiceButton}
            >
              Listen
            </Button>
            <Button
              compact
              mode="contained-tonal"
              disabled={actionLoading}
              onPress={() => void openPractice('speak')}
              style={styles.practiceButton}
            >
              Speak
            </Button>
            <Button
              compact
              mode="contained-tonal"
              disabled={actionLoading}
              onPress={() => void openPractice('read')}
              style={styles.practiceButton}
            >
              Read
            </Button>
            <Button
              compact
              mode="contained-tonal"
              disabled={actionLoading}
              onPress={() => void openPractice('write')}
              style={styles.practiceButton}
            >
              Write
            </Button>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            Loading words...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Searchbar
                placeholder="Search words or phrases"
                value={search}
                onChangeText={setSearch}
                style={[styles.searchbar, { backgroundColor: colors.surface }]}
                inputStyle={{ color: colors.onSurface }}
                iconColor={colors.onSurfaceSecondary}
                placeholderTextColor={colors.onSurfaceSecondary}
              />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary }}>
                {filteredItems.length === items.length
                  ? `${items.length} total items`
                  : `${filteredItems.length} of ${items.length} items`}
              </Text>
              {relatedBooks.length > 0 ? (
                <View style={styles.relatedSection}>
                  <Text style={[styles.relatedTitle, { color: colors.onSurface }]}>Related wordbooks</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {relatedBooks.map((related) => (
                      <Pressable
                        key={related.id}
                        onPress={() => router.push(`/wordbook/${related.id}`)}
                        style={({ pressed }) => [
                          styles.relatedCard,
                          { backgroundColor: colors.surface },
                          pressed && { opacity: 0.72 },
                        ]}
                      >
                        <Text style={styles.relatedEmoji}>{related.emoji}</Text>
                        <View style={styles.relatedCopy}>
                          <Text style={[styles.relatedName, { color: colors.onSurface }]} numberOfLines={1}>
                            {related.nameEn}
                          </Text>
                          <Text style={[styles.relatedMeta, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                            {related.filterTag} · {getWordBookItemCount(related)} items
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.wordCard,
                { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                void haptics.light();
              }}
            >
              <View style={styles.wordContent}>
                <Text style={[styles.wordTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}>
                  {item.title}
                </Text>
                {item.text !== item.title ? (
                  <Text style={[styles.wordExample, { color: colors.onSurfaceSecondary }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="volume-high" size={20} color={vocabColors.primary} />
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No entries match your search</Text>
              <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
                Try a different keyword or clear the search field.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  appbar: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.92,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerChipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  headerCount: {
    fontSize: 14,
    opacity: 0.92,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  headerButton: {
    borderColor: 'rgba(255,255,255,0.2)',
  },
  practiceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  practiceButton: {
    minWidth: 88,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  listHeader: {
    marginBottom: 14,
  },
  searchbar: {
    marginBottom: 10,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderCurve: 'continuous',
  },
  wordContent: {
    flex: 1,
  },
  wordTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  wordExample: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  relatedSection: {
    marginTop: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 220,
    padding: 12,
    borderRadius: 14,
    marginRight: 10,
    borderCurve: 'continuous',
  },
  relatedEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  relatedCopy: {
    flex: 1,
  },
  relatedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  relatedMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
