import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Chip, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { EditContentModal } from '@/components/library/EditContentModal';
import { ImportModal } from '@/components/library/ImportModal';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useLibraryStore } from '@/stores/useLibraryStore';

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const { mode } = useLocalSearchParams<{ mode?: 'read' | 'write' }>();
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);

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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text variant="headlineMedium" style={[styles.title, { color: colors.onSurface }]}>
            Library
          </Text>
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={<IconButton icon="sort" iconColor={colors.onSurface} onPress={() => setSortMenuVisible(true)} />}
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

        {/* Search */}
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.onSurface }]}
          placeholder="Search contents..."
          placeholderTextColor={colors.onSurfaceSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />

        {/* Favorites filter */}
        <View style={styles.filterRow}>
          <Chip
            icon={showFavoritesOnly ? 'heart' : 'heart-outline'}
            mode={showFavoritesOnly ? 'flat' : 'outlined'}
            selected={showFavoritesOnly}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={[styles.favoritesChip, showFavoritesOnly && { backgroundColor: '#FF2D55' }]}
            textStyle={showFavoritesOnly && { color: '#FFFFFF' }}
          >
            Favorites Only
          </Chip>
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
            <FlatList
              horizontal
              data={allTags}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Chip
                  mode={filterTags.includes(item) ? 'flat' : 'outlined'}
                  selected={filterTags.includes(item)}
                  onPress={() => toggleTag(item)}
                  style={styles.tagChip}
                >
                  {item}
                </Chip>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Content list */}
        {displayedContents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="headlineSmall" style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No Content Yet
            </Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Import content from URLs, YouTube, PDFs, or generate with AI
            </Text>
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
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: '#007AFF' }]}
          color="#FFFFFF"
          onPress={() => setImportModalVisible(true)}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  favoritesChip: {
    marginRight: 8,
  },
  tagContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tagChip: {
    marginRight: 8,
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
    marginBottom: 8,
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    backgroundColor: '#6366F1',
  },
});
