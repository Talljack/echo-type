import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Chip, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { ImportModal } from '@/components/library/ImportModal';
import { useLibraryStore } from '@/stores/useLibraryStore';

export default function LibraryScreen() {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const {
    contents,
    searchQuery,
    filterTags,
    sortBy,
    setSearchQuery,
    setFilterTags,
    setSortBy,
    searchContents,
    filterByTags,
    getAllTags,
  } = useLibraryStore();

  const allTags = getAllTags();

  // Apply search, filter, and sort
  const displayedContents = useMemo(() => {
    let filtered = contents;

    // Search
    if (searchQuery.trim()) {
      filtered = searchContents(searchQuery);
    }

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filterByTags(filterTags);
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
  }, [contents, searchQuery, filterTags, sortBy]);

  const toggleTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter((t) => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  const handleContentPress = (contentId: string) => {
    // Navigate to content detail (will implement in next batch)
    console.log('Content pressed:', contentId);
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Library
          </Text>
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={<IconButton icon="sort" onPress={() => setSortMenuVisible(true)} />}
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
          style={styles.searchInput}
          placeholder="Search contents..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />

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
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Content Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Import content from URLs, YouTube, PDFs, or generate with AI
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedContents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ContentCard content={item} onPress={() => handleContentPress(item.id)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Import FAB */}
        <FAB icon="plus" style={styles.fab} onPress={() => setImportModalVisible(true)} />

        {/* Import Modal */}
        <ImportModal visible={importModalVisible} onDismiss={() => setImportModalVisible(false)} />
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
  tagContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tagChip: {
    marginRight: 8,
  },
  list: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    bottom: 16,
    backgroundColor: '#6366F1',
  },
});
