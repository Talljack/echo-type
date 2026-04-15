import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Chip, Divider, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { EditContentModal } from '@/components/library/EditContentModal';
import { ImportModal } from '@/components/library/ImportModal';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { Content, Difficulty } from '@/lib/storage/types';
import { useLibraryStore } from '@/stores/useLibraryStore';

type ViewTab = 'all' | 'phrase' | 'sentence' | 'article';
type ViewMode = 'all' | 'media';

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const { mode } = useLocalSearchParams<{ mode?: 'read' | 'write' }>();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ViewTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | ''>('');
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
    searchContents,
    filterByTags,
    getAllTags,
    toggleFavorite,
    updateContent,
    deleteContent,
    addSampleContents,
  } = useLibraryStore();

  const allTags = getAllTags();

  // Apply search, filter, and sort
  const displayedContents = useMemo(() => {
    let filtered = contents;

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter((c) => c.isFavorite);
    }

    // Search
    if (searchQuery.trim()) {
      filtered = searchContents(searchQuery);
      if (showFavoritesOnly) {
        filtered = filtered.filter((c) => c.isFavorite);
      }
    }

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filterByTags(filterTags);
      if (showFavoritesOnly) {
        filtered = filtered.filter((c) => c.isFavorite);
      }
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
  }, [contents, searchQuery, filterTags, sortBy, showFavoritesOnly]);

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
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="bookshelf" size={32} color="#FFFFFF" />
              <Text variant="headlineLarge" style={styles.headerTitle}>
                Library
              </Text>
            </View>
            <Menu
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchor={
                <IconButton
                  icon="sort"
                  iconColor="#FFFFFF"
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
        </LinearGradient>

        {/* Search with icon */}
        <View style={styles.searchContainer}>
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

        {/* Favorites filter with stats */}
        <View style={styles.filterRow}>
          <Chip
            icon={showFavoritesOnly ? 'heart' : 'heart-outline'}
            mode={showFavoritesOnly ? 'flat' : 'outlined'}
            selected={showFavoritesOnly}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={[styles.favoritesChip, showFavoritesOnly && { backgroundColor: '#FF2D55' }]}
            textStyle={showFavoritesOnly && { color: '#FFFFFF' }}
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
                  style={[styles.tagChip, filterTags.includes(tag) && { backgroundColor: '#8B5CF6' }]}
                  textStyle={filterTags.includes(tag) && { color: '#FFFFFF' }}
                >
                  {tag}
                </Chip>
              ))}
            </ScrollView>
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
                style={[styles.sampleButton, { backgroundColor: '#007AFF' }]}
                labelStyle={{ color: '#FFFFFF' }}
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
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Import FAB */}
        <FAB icon="plus" style={styles.fab} color="#FFFFFF" onPress={() => setImportModalVisible(true)} />

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
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 34,
  },
  sortButton: {
    margin: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
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
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  sampleButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
  },
});
