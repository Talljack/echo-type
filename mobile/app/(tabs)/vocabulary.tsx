import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Button, Chip, Dialog, FAB, IconButton, TextInput as PaperTextInput, Portal, Text } from 'react-native-paper';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { AddFavoriteModal } from '@/components/favorites/AddFavoriteModal';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { previewRatings, Rating } from '@/lib/fsrs';
import { haptics } from '@/lib/haptics';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { fontFamily } from '@/theme/typography';
import type { FavoriteItem } from '@/types/favorite';

type FolderFilter = 'all' | string;

export default function FavoritesScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabularyColors = getModuleColors('vocabulary');
  const items = useFavoriteStore((s) => s.items);
  const folders = useFavoriteStore((s) => s.folders);
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
  const getFavoriteCount = useFavoriteStore((s) => s.getFavoriteCount);
  const gradeFavorite = useFavoriteStore((s) => s.gradeFavorite);
  const addFolder = useFavoriteStore((s) => s.addFolder);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');

  const stats = getFavoriteCount();

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void haptics.light();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (folderFilter !== 'all') {
      list = list.filter((i) => i.folderId === folderFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.text.toLowerCase().includes(q) ||
          i.translation.toLowerCase().includes(q) ||
          (i.notes?.toLowerCase().includes(q) ?? false) ||
          (i.context?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [items, folderFilter, search]);

  const handleDelete = (id: string) => {
    void haptics.medium();
    removeFavorite(id);
  };

  const handleReview = () => {
    router.push('/review');
  };

  const confirmAddFolder = () => {
    addFolder(newFolderName, newFolderEmoji);
    setNewFolderName('');
    setNewFolderEmoji('📁');
    setAddFolderOpen(false);
    void haptics.success();
  };

  const renderRelated = (item: FavoriteItem) => {
    const r = item.related;
    if (!r) return null;
    const parts: string[] = [];
    if (r.synonyms?.length) parts.push(`Synonyms: ${r.synonyms.join(', ')}`);
    if (r.wordFamily?.length) {
      parts.push(`Word family: ${r.wordFamily.map((w) => `${w.word} (${w.pos})`).join(', ')}`);
    }
    if (r.relatedPhrases?.length) parts.push(`Phrases: ${r.relatedPhrases.join(', ')}`);
    if (r.keyVocabulary?.length) {
      parts.push(`Key vocab: ${r.keyVocabulary.map((k) => `${k.word} → ${k.translation}`).join('; ')}`);
    }
    if (!parts.length) return null;
    return (
      <View style={[styles.relatedBlock, { backgroundColor: colors.surfaceVariant }]}>
        {parts.map((line) => (
          <Text key={line} variant="bodySmall" style={[styles.relatedLine, { color: colors.onSurfaceVariant }]}>
            {line}
          </Text>
        ))}
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: FavoriteItem; index: number }) => {
    const isOpen = !!expanded[item.id];
    const intervals = previewRatings(item.fsrsCard);
    // Rating colors are semantic and should remain fixed across themes
    const ratingStyle = [
      { rating: Rating.Again, label: 'Again', color: '#EF4444' }, // red
      { rating: Rating.Hard, label: 'Hard', color: '#F59E0B' }, // amber
      { rating: Rating.Good, label: 'Good', color: '#10B981' }, // green
      { rating: Rating.Easy, label: 'Easy', color: '#6366F1' }, // indigo
    ] as const;

    return (
      <Animated.View entering={FadeInRight.delay(Math.min(index * 40, 400))}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Pressable
                onPress={() => toggleExpanded(item.id)}
                style={({ pressed }) => [styles.titlePress, pressed && styles.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${item.text}. ${item.type}. ${isOpen ? 'Expanded' : 'Collapsed'}`}
                accessibilityHint={isOpen ? 'Double tap to collapse' : 'Double tap to expand and see details'}
                accessibilityState={{ expanded: isOpen }}
              >
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.onSurfaceVariant}
                    style={styles.chevron}
                  />
                  <Text
                    variant="titleLarge"
                    style={[styles.word, { color: colors.onSurface, fontFamily: fontFamily.heading }]}
                  >
                    {item.text}
                  </Text>
                </View>
              </Pressable>
              <IconButton
                icon="delete-outline"
                size={20}
                onPress={() => handleDelete(item.id)}
                iconColor={colors.error}
                accessibilityLabel="Delete favorite"
                accessibilityHint="Double tap to remove this item from favorites"
                accessibilityRole="button"
              />
            </View>
            <Pressable onPress={() => toggleExpanded(item.id)} style={({ pressed }) => pressed && styles.cardPressed}>
              <View style={styles.typeRow}>
                <Chip compact mode="outlined" style={styles.typeChip} textStyle={{ fontSize: 11 }}>
                  {item.type}
                </Chip>
                {item.autoCollected ? (
                  <Chip compact mode="flat" style={styles.typeChip}>
                    Auto
                  </Chip>
                ) : null}
              </View>

              {isOpen ? null : (
                <Text
                  variant="bodyMedium"
                  numberOfLines={1}
                  style={[styles.previewTranslation, { color: colors.onSurfaceVariant }]}
                >
                  {item.translation}
                </Text>
              )}
            </Pressable>

            {isOpen ? (
              <View style={styles.expanded}>
                <Text variant="bodyLarge" style={[styles.translation, { color: colors.onSurface }]}>
                  {item.translation}
                </Text>
                {item.pronunciation ? (
                  <Text variant="bodyMedium" style={{ color: colors.onSurfaceSecondary, marginBottom: 8 }}>
                    {item.pronunciation}
                  </Text>
                ) : null}
                {item.context ? (
                  <View style={[styles.quoteBox, { backgroundColor: colors.surfaceVariant }]}>
                    <MaterialCommunityIcons name="format-quote-open" size={16} color={colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={[styles.contextText, { color: colors.onSurfaceVariant }]}>
                      {item.context}
                    </Text>
                  </View>
                ) : null}
                {item.notes ? (
                  <Text variant="bodySmall" style={[styles.notes, { color: colors.onSurfaceSecondary }]}>
                    Notes: {item.notes}
                  </Text>
                ) : null}
                {renderRelated(item)}
                <View style={styles.ratingRow}>
                  {ratingStyle.map((btn) => (
                    <Pressable
                      key={btn.rating}
                      onPress={() => {
                        void haptics.medium();
                        gradeFavorite(item.id, btn.rating);
                      }}
                      style={[styles.gradePill, { borderColor: btn.color, backgroundColor: colors.background }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate as ${btn.label}`}
                      accessibilityHint={`Next review in ${intervals[btn.rating].interval}`}
                    >
                      <Text variant="labelSmall" style={{ color: btn.color, fontWeight: '700' }}>
                        {btn.label}
                      </Text>
                      <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, fontSize: 9 }}>
                        {intervals[btn.rating].interval}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={[styles.nextReviewBadge, { backgroundColor: `${vocabularyColors.primary}20` }]}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color={vocabularyColors.primary} />
                <Text variant="labelSmall" style={[styles.nextReview, { color: vocabularyColors.primary }]}>
                  {item.fsrsCard ? new Date(item.fsrsCard.due).toLocaleDateString() : 'New'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Screen padding={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text
            variant="displaySmall"
            style={[styles.title, { color: colors.onSurface, fontFamily: fontFamily.headingBold }]}
          >
            Favorites
          </Text>
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="bookmark-multiple-outline" size={24} color={vocabularyColors.primary} />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: colors.onSurface }]}>
              {stats.total}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Total
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="clock-alert-outline" size={24} color={colors.error} />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: colors.error }]}>
              {stats.due}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              Due Today
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="star-outline" size={24} color={colors.success} />
            <Text variant="headlineSmall" style={[styles.statNumber, { color: colors.onSurface }]}>
              {stats.new}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              New
            </Text>
          </View>
        </Animated.View>

        {stats.due > 0 && (
          <Animated.View entering={FadeInDown.delay(160)} style={styles.reviewButtonContainer}>
            <Button
              mode="contained"
              onPress={handleReview}
              style={[styles.reviewButton, { backgroundColor: vocabularyColors.primary }]}
              contentStyle={styles.reviewButtonContent}
              labelStyle={[styles.reviewButtonLabel, { fontFamily: fontFamily.heading }]}
              accessibilityLabel={`Review ${stats.due} card${stats.due > 1 ? 's' : ''}`}
              accessibilityHint="Double tap to start reviewing due cards"
              accessibilityRole="button"
            >
              Review {stats.due} card{stats.due > 1 ? 's' : ''}
            </Button>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200)} style={styles.chipsScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip
              mode={folderFilter === 'all' ? 'flat' : 'outlined'}
              selected={folderFilter === 'all'}
              onPress={() => setFolderFilter('all')}
              style={[styles.folderChip, folderFilter === 'all' && { backgroundColor: vocabularyColors.primary }]}
              textStyle={folderFilter === 'all' ? { color: colors.onPrimary } : { color: colors.onSurface }}
              accessibilityRole="button"
              accessibilityLabel="Show all folders"
              accessibilityState={{ selected: folderFilter === 'all' }}
            >
              All
            </Chip>
            {folders.map((f) => (
              <Chip
                key={f.id}
                mode={folderFilter === f.id ? 'flat' : 'outlined'}
                selected={folderFilter === f.id}
                onPress={() => setFolderFilter(f.id)}
                style={[styles.folderChip, folderFilter === f.id && { backgroundColor: vocabularyColors.primary }]}
                textStyle={folderFilter === f.id ? { color: colors.onPrimary } : { color: colors.onSurface }}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${f.name}`}
                accessibilityState={{ selected: folderFilter === f.id }}
              >
                {f.emoji} {f.name}
              </Chip>
            ))}
            <Chip
              mode="outlined"
              icon="plus"
              onPress={() => setAddFolderOpen(true)}
              style={styles.folderChip}
              textStyle={{ color: colors.primary }}
              accessibilityRole="button"
              accessibilityLabel="Add new folder"
              accessibilityHint="Double tap to create a new folder"
            >
              Add
            </Chip>
          </ScrollView>
        </Animated.View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface, fontFamily: fontFamily.body }]}
            placeholder="Search favorites..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        {items.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(280)} style={styles.emptyState}>
            <MaterialCommunityIcons name="heart-outline" size={80} color={colors.onSurfaceVariant} />
            <Text
              variant="headlineSmall"
              style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fontFamily.heading }]}
            >
              No favorites yet
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Save words while practicing or tap + to add manually
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyInline}>
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                  No matches for this folder or search.
                </Text>
              </View>
            }
          />
        )}

        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setAddModalVisible(true)}
          color={colors.onPrimary}
          accessibilityLabel="Add favorite"
          accessibilityHint="Double tap to add a new word or phrase to favorites"
          accessibilityRole="button"
        />

        <AddFavoriteModal visible={addModalVisible} selectedWord="" onDismiss={() => setAddModalVisible(false)} />

        <Portal>
          <Dialog visible={addFolderOpen} onDismiss={() => setAddFolderOpen(false)}>
            <Dialog.Title>New folder</Dialog.Title>
            <Dialog.Content>
              <PaperTextInput
                label="Emoji"
                value={newFolderEmoji}
                onChangeText={setNewFolderEmoji}
                mode="outlined"
                style={styles.dialogInput}
              />
              <PaperTextInput
                label="Name"
                value={newFolderName}
                onChangeText={setNewFolderName}
                mode="outlined"
                style={styles.dialogInput}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setAddFolderOpen(false)}>Cancel</Button>
              <Button onPress={confirmAddFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 0.4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    // Shadow colors remain fixed for consistent elevation across themes
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  reviewButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  reviewButton: {
    borderRadius: 14,
    borderCurve: 'continuous',
    // Shadow color matches primary for glow effect
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reviewButtonContent: {
    paddingVertical: 8,
  },
  reviewButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  chipsScrollWrap: {
    marginBottom: 10,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderChip: {
    marginRight: 4,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    // Shadow for subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    // Shadow for card elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titlePress: {
    flex: 1,
    marginRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  chevron: {
    marginRight: 4,
  },
  word: {
    fontWeight: '700',
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  previewTranslation: {
    marginBottom: 8,
  },
  expanded: {
    marginTop: 4,
    marginBottom: 8,
  },
  translation: {
    marginBottom: 8,
    lineHeight: 24,
  },
  quoteBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginBottom: 10,
    gap: 8,
  },
  contextText: {
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  notes: {
    marginBottom: 8,
  },
  relatedBlock: {
    padding: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginBottom: 12,
    gap: 6,
  },
  relatedLine: {
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  gradePill: {
    flexGrow: 1,
    minWidth: '22%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 2,
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  nextReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  nextReview: {
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  emptyInline: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  dialogInput: {
    marginBottom: 12,
  },
});
