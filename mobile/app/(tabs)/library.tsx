import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, Divider, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { EditContentModal } from '@/components/library/EditContentModal';
import { ImportModal } from '@/components/library/ImportModal';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { fontFamily } from '@/theme/typography';
import type { DifficultyLevel } from '@/types/content';

type ViewTab = 'all' | 'word' | 'phrase' | 'sentence' | 'article';
type ViewMode = 'all' | 'media';

export default function LibraryScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const vocabularyModuleColors = getModuleColors('vocabulary');
  const { mode } = useLocalSearchParams<{ mode?: 'read' | 'write' }>();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ViewTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | ''>('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    contents,
    searchQuery,
    filterTags,
    sortBy,
    showFavoritesOnly,
    setSearchQuery,
    setFilterTags,
    setSortBy,
    setShowFavoritesOnly,
    getAllTags,
    toggleFavorite,
    deleteContent,
    addSampleContents,
  } = useLibraryStore();

  const allTags = getAllTags();

  // Apply search, filter, and sort
  const displayedContents = useMemo(() => {
    let filtered = contents;

    // Filter by view tab (type)
    if (activeViewTab !== 'all') {
      filtered = filtered.filter((c) => c.type === activeViewTab);
    }

    // Filter by view mode (media only)
    if (viewMode === 'media') {
      filtered = filtered.filter((c) => c.source === 'youtube' || c.source === 'local-media');
    }

    // Filter by difficulty
    if (difficultyFilter) {
      filtered = filtered.filter((c) => c.difficulty === difficultyFilter);
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter((c) => c.isFavorite);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.text.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filtered.filter((c) => filterTags.every((t) => c.tags.includes(t)));
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'difficulty': {
        const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        sorted.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
        break;
      }
    }

    return sorted;
  }, [contents, activeViewTab, viewMode, difficultyFilter, searchQuery, filterTags, sortBy, showFavoritesOnly]);

  const toggleTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter((t) => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  const handleContentPress = (contentId: string) => {
    router.push(`/content/${contentId}`);
  };

  const handleEdit = (contentId: string) => {
    setEditingContentId(contentId);
    setEditModalVisible(true);
  };

  const editingContent = editingContentId ? contents.find((c) => c.id === editingContentId) : null;

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with gradient */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="bookshelf" size={32} color={colors.onPrimary} />
              <View>
                <Text variant="headlineLarge" style={[styles.headerTitle, { color: colors.onPrimary }]}>
                  Library
                </Text>
                <Text variant="bodySmall" style={[styles.headerSubtitle, { color: colors.onPrimary }]}>
                  {displayedContents.length} {displayedContents.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                icon={selectMode ? 'close' : 'checkbox-multiple-marked'}
                iconColor={colors.onPrimary}
                onPress={() => {
                  if (selectMode) {
                    setSelectMode(false);
                    setSelectedIds(new Set());
                  } else {
                    setSelectMode(true);
                  }
                }}
                style={styles.actionButton}
              />
              <Menu
                visible={sortMenuVisible}
                onDismiss={() => setSortMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="sort"
                    iconColor={colors.onPrimary}
                    onPress={() => setSortMenuVisible(true)}
                    style={styles.sortButton}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSortBy('recent');
                    setSortMenuVisible(false);
                  }}
                  title="Most Recent"
                  leadingIcon={sortBy === 'recent' ? 'check' : undefined}
                />
                <Menu.Item
                  onPress={() => {
                    setSortBy('title');
                    setSortMenuVisible(false);
                  }}
                  title="Title"
                  leadingIcon={sortBy === 'title' ? 'check' : undefined}
                />
                <Menu.Item
                  onPress={() => {
                    setSortBy('difficulty');
                    setSortMenuVisible(false);
                  }}
                  title="Difficulty"
                  leadingIcon={sortBy === 'difficulty' ? 'check' : undefined}
                />
              </Menu>
            </View>
          </View>
        </LinearGradient>

        <Pressable
          style={({ pressed }) => [
            styles.wordbooksCard,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/wordbooks' as Href);
          }}
        >
          <View style={[styles.wordbooksIcon, { backgroundColor: vocabularyModuleColors.background }]}>
            <MaterialCommunityIcons name="card-text-outline" size={24} color={vocabularyModuleColors.primary} />
          </View>
          <View style={styles.wordbooksInfo}>
            <Text variant="titleMedium" style={[styles.wordbooksTitle, { color: colors.onSurface }]}>
              Wordbooks
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              Browse vocabulary collections
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </Pressable>

        {/* Search with icon */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, shadowColor: colors.shadowLight }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search your library..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* View Tabs */}
        <View style={styles.viewTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'word', 'phrase', 'sentence', 'article'] as ViewTab[]).map((tab) => (
              <Chip
                key={tab}
                mode={activeViewTab === tab ? 'flat' : 'outlined'}
                selected={activeViewTab === tab}
                onPress={() => setActiveViewTab(tab)}
                style={[styles.viewTabChip, activeViewTab === tab && { backgroundColor: colors.primary }]}
                textStyle={[styles.viewTabText, activeViewTab === tab && { color: colors.onPrimary }]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* View Mode */}
            <View style={styles.filterGroup}>
              <Chip
                mode={viewMode === 'all' ? 'flat' : 'outlined'}
                selected={viewMode === 'all'}
                onPress={() => setViewMode('all')}
                style={[styles.filterChip, viewMode === 'all' && { backgroundColor: colors.primary }]}
                textStyle={[styles.filterText, viewMode === 'all' && { color: colors.onPrimary }]}
              >
                All
              </Chip>
              <Chip
                mode={viewMode === 'media' ? 'flat' : 'outlined'}
                selected={viewMode === 'media'}
                onPress={() => setViewMode('media')}
                icon="video"
                style={[styles.filterChip, viewMode === 'media' && { backgroundColor: colors.primary }]}
                textStyle={[styles.filterText, viewMode === 'media' && { color: colors.onPrimary }]}
              >
                Media
              </Chip>
            </View>

            <Divider style={[styles.filterDivider, { backgroundColor: colors.borderLight }]} />

            {/* Difficulty Filter */}
            <View style={styles.filterGroup}>
              {(['', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                <Chip
                  key={diff || 'all-diff'}
                  mode={difficultyFilter === diff ? 'flat' : 'outlined'}
                  selected={difficultyFilter === diff}
                  onPress={() => setDifficultyFilter(diff as DifficultyLevel | '')}
                  style={[styles.filterChip, difficultyFilter === diff && { backgroundColor: colors.primary }]}
                  textStyle={[styles.filterText, difficultyFilter === diff && { color: colors.onPrimary }]}
                >
                  {diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : 'All Levels'}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Favorites filter with stats */}
        <View style={styles.filterRow}>
          <Chip
            icon={showFavoritesOnly ? 'heart' : 'heart-outline'}
            mode={showFavoritesOnly ? 'flat' : 'outlined'}
            selected={showFavoritesOnly}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={[styles.favoritesChip, showFavoritesOnly && { backgroundColor: colors.accentPink }]}
            textStyle={showFavoritesOnly && { color: colors.onPrimary }}
          >
            Favorites
          </Chip>
          <Text variant="bodySmall" style={[styles.statsText, { color: colors.onSurfaceVariant }]}>
            {displayedContents.length} {displayedContents.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Practice intent banner */}
        {mode ? (
          <View style={styles.intentBanner}>
            <MvpNoticeCard
              title={`Pick content for ${mode === 'read' ? 'Read' : 'Write'}`}
              body="Choose a saved text below to continue into the selected practice mode."
            />
          </View>
        ) : null}

        {/* Tag filters */}
        {allTags.length > 0 && (
          <View style={styles.tagContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {allTags.map((tag) => (
                <Chip
                  key={tag}
                  mode={filterTags.includes(tag) ? 'flat' : 'outlined'}
                  selected={filterTags.includes(tag)}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagChip, filterTags.includes(tag) && { backgroundColor: colors.primary }]}
                  textStyle={filterTags.includes(tag) && { color: colors.onPrimary }}
                >
                  {tag}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Batch Actions Bar */}
        {selectMode && selectedIds.size > 0 && (
          <View style={[styles.batchActionsBar, { backgroundColor: colors.primary }]}>
            <Text variant="bodyMedium" style={[styles.batchActionsText, { color: colors.onPrimary }]}>
              {selectedIds.size} selected
            </Text>
            <View style={styles.batchActions}>
              <Button
                mode="outlined"
                onPress={async () => {
                  // Batch delete
                  for (const id of selectedIds) {
                    await deleteContent(id);
                  }
                  setSelectedIds(new Set());
                }}
                icon="delete"
                compact
                textColor={colors.error}
                style={styles.batchActionButton}
              >
                Delete
              </Button>
            </View>
          </View>
        )}

        {/* Content list */}
        {displayedContents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={80} color={colors.onSurfaceVariant} />
            <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
              {contents.length === 0 ? 'No Content Yet' : 'No Results Found'}
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {contents.length === 0
                ? 'Import content from URLs, YouTube, PDFs, or generate with AI'
                : 'Try adjusting your search or filters'}
            </Text>
            {contents.length === 0 && (
              <Button
                mode="contained"
                onPress={addSampleContents}
                style={[styles.sampleButton, { backgroundColor: colors.primary }]}
                labelStyle={{ color: colors.onPrimary }}
                icon="lightbulb-on"
              >
                Load Sample Content
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={displayedContents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ContentCard
                content={item}
                onPress={() => handleContentPress(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onEdit={handleEdit}
                onDelete={async (id) => {
                  await deleteContent(id);
                }}
                selectable={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={(id) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) {
                      next.delete(id);
                    } else {
                      next.add(id);
                    }
                    return next;
                  });
                }}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Import FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setImportModalVisible(true);
          }}
        />

        {/* Import Modal */}
        <ImportModal visible={importModalVisible} onDismiss={() => setImportModalVisible(false)} />

        {/* Edit Modal */}
        {editingContent && (
          <EditContentModal
            visible={editModalVisible}
            content={editingContent}
            onDismiss={() => {
              setEditModalVisible(false);
              setEditingContentId(null);
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  wordbooksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    gap: 12,
  },
  wordbooksIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordbooksInfo: {
    flex: 1,
  },
  wordbooksTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: fontFamily.headingBold,
    fontWeight: 'bold',
    fontSize: 34,
  },
  headerSubtitle: {
    opacity: 0.9,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
  },
  sortButton: {
    margin: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  viewTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewTabChip: {
    marginRight: 8,
    borderRadius: 20,
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  filterChip: {
    marginRight: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 24,
    alignSelf: 'center',
    marginHorizontal: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  favoritesChip: {
    borderRadius: 20,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tagChip: {
    marginRight: 8,
    borderRadius: 20,
  },
  intentBanner: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  batchActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  batchActionsText: {
    fontWeight: '600',
    fontSize: 14,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchActionButton: {
    margin: 0,
  },
  list: {
    padding: 16,
    paddingBottom: 140,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingBottom: 140,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  sampleButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    borderCurve: 'continuous',
    borderRadius: 16,
  },
});
