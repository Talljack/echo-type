import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SectionBase } from 'react-native';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Button, Chip, Divider, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { ContentCard } from '@/components/library/ContentCard';
import { EditContentModal } from '@/components/library/EditContentModal';
import { ImportModal } from '@/components/library/ImportModal';
import { LibrarySectionHeader } from '@/components/library/LibrarySectionHeader';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { ALL_WORDBOOKS } from '@/lib/wordbooks';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { fontFamily } from '@/theme/typography';
import type { Content, DifficultyLevel } from '@/types/content';

type ViewTab = 'all' | 'wordbook' | 'book' | 'phrase' | 'sentence' | 'article' | 'scenario';

function isKnownWordbook(category: string | undefined): boolean {
  return !!category && ALL_WORDBOOKS.some((b) => b.id === category);
}

function getWordbookKind(category: string | undefined): 'vocabulary' | 'scenario' | undefined {
  if (!category) return undefined;
  return ALL_WORDBOOKS.find((book) => book.id === category)?.kind;
}

function formatBookCategoryTitle(category: string | undefined): string {
  if (!category) return 'Books';
  if (!category.startsWith('book-')) return category;
  return category
    .replace(/^book-/, '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

type LibrarySectionMeta = {
  key: string;
  title: string;
  fullData: Content[];
  practiceEntryContentId?: string;
};

type LibrarySection = SectionBase<Content> & LibrarySectionMeta;

function partitionLibraryContents(items: Content[]) {
  const wordbooks = new Map<string, Content[]>();
  const phrases: Content[] = [];
  const sentences: Content[] = [];
  const articles: Content[] = [];
  const words: Content[] = [];
  const other: Content[] = [];

  for (const item of items) {
    if (item.category && isKnownWordbook(item.category)) {
      const existing = wordbooks.get(item.category) ?? [];
      existing.push(item);
      wordbooks.set(item.category, existing);
      continue;
    }
    if (item.type === 'article' && item.category?.startsWith('book-')) {
      continue;
    }
    switch (item.type) {
      case 'phrase':
        phrases.push(item);
        break;
      case 'sentence':
        sentences.push(item);
        break;
      case 'article':
        articles.push(item);
        break;
      case 'word':
        words.push(item);
        break;
      default:
        other.push(item);
        break;
    }
  }
  return { wordbooks, phrases, sentences, articles, words, other };
}
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBatchTagInput, setShowBatchTagInput] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');

  const {
    contents,
    searchQuery,
    filterTags,
    sortBy,
    showStarredOnly,
    setSearchQuery,
    setFilterTags,
    setSortBy,
    setShowStarredOnly,
    getAllTags,
    getStarredContents,
    toggleStarred,
    updateContent,
    deleteContent,
    addSampleContents,
  } = useLibraryStore();

  const allTags = getAllTags();
  const starredContents = getStarredContents();

  // Apply search, filter, and sort
  const displayedContents = useMemo(() => {
    let filtered = contents;

    // Filter by view tab
    if (activeViewTab !== 'all') {
      if (activeViewTab === 'wordbook') {
        filtered = filtered.filter((c) => getWordbookKind(c.category) === 'vocabulary');
      } else if (activeViewTab === 'scenario') {
        filtered = filtered.filter((c) => getWordbookKind(c.category) === 'scenario');
      } else if (activeViewTab === 'book') {
        filtered = filtered.filter((c) => c.type === 'article' && Boolean(c.category?.startsWith('book-')));
      } else {
        filtered = filtered.filter((c) => c.type === activeViewTab);
        if (activeViewTab === 'article') {
          filtered = filtered.filter((c) => !c.category?.startsWith('book-'));
        }
      }
    }

    // Filter by view mode (media only)
    if (viewMode === 'media') {
      filtered = filtered.filter((c) => c.source === 'youtube' || c.source === 'local-media');
    }

    // Filter by difficulty
    if (difficultyFilter) {
      filtered = filtered.filter((c) => c.difficulty === difficultyFilter);
    }

    // Filter by starred
    if (showStarredOnly) {
      filtered = filtered.filter((c) => c.isStarred);
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
  }, [contents, activeViewTab, viewMode, difficultyFilter, searchQuery, filterTags, sortBy, showStarredOnly]);

  const baseSections = useMemo((): LibrarySectionMeta[] => {
    const sorted = displayedContents;

    if (activeViewTab === 'wordbook' || activeViewTab === 'scenario') {
      const map = new Map<string, Content[]>();
      for (const item of sorted) {
        if (!(item.category && isKnownWordbook(item.category))) continue;
        if (activeViewTab === 'wordbook' && getWordbookKind(item.category) !== 'vocabulary') continue;
        if (activeViewTab === 'scenario' && getWordbookKind(item.category) !== 'scenario') continue;
        const arr = map.get(item.category) ?? [];
        arr.push(item);
        map.set(item.category, arr);
      }
      const sections: LibrarySectionMeta[] = [];
      for (const book of ALL_WORDBOOKS) {
        if (activeViewTab === 'wordbook' && book.kind !== 'vocabulary') continue;
        if (activeViewTab === 'scenario' && book.kind !== 'scenario') continue;
        const fd = map.get(book.id);
        if (!fd?.length) continue;
        sections.push({
          key: `wb:${book.id}`,
          title: `${book.emoji} ${book.nameEn}`,
          fullData: fd,
          practiceEntryContentId: fd[0]?.id,
        });
      }
      return sections;
    }

    if (activeViewTab === 'book') {
      const groups = new Map<string, Content[]>();
      for (const item of sorted) {
        const key = item.category ?? 'book:uncategorized';
        const list = groups.get(key) ?? [];
        list.push(item);
        groups.set(key, list);
      }
      return Array.from(groups.entries()).map(([key, fullData]) => ({
        key: `book:${key}`,
        title: formatBookCategoryTitle(key),
        fullData,
        practiceEntryContentId: fullData[0]?.id,
      }));
    }

    if (activeViewTab === 'phrase') {
      if (!sorted.length) return [];
      return [{ key: 'type:phrase', title: 'Phrases', fullData: sorted }];
    }

    if (activeViewTab === 'sentence') {
      if (!sorted.length) return [];
      return [{ key: 'type:sentence', title: 'Sentences', fullData: sorted }];
    }

    if (activeViewTab === 'article') {
      if (!sorted.length) return [];
      return [{ key: 'type:article', title: 'Articles', fullData: sorted }];
    }

    const g = partitionLibraryContents(sorted);
    const sections: LibrarySectionMeta[] = [];

    for (const book of ALL_WORDBOOKS) {
      if (book.kind !== 'vocabulary') continue;
      const fd = g.wordbooks.get(book.id);
      if (!fd?.length) continue;
      sections.push({
        key: `wb:vocab:${book.id}`,
        title: `${book.emoji} ${book.nameEn}`,
        fullData: fd,
        practiceEntryContentId: fd[0]?.id,
      });
    }

    if (g.words.length) {
      sections.push({ key: 'pool:words', title: 'Words', fullData: g.words });
    }
    if (g.phrases.length) {
      sections.push({ key: 'pool:phrases', title: 'Phrases', fullData: g.phrases });
    }
    if (g.sentences.length) {
      sections.push({ key: 'pool:sentences', title: 'Sentences', fullData: g.sentences });
    }
    if (g.articles.length) {
      sections.push({ key: 'pool:articles', title: 'Articles', fullData: g.articles });
    }
    if (g.other.length) {
      sections.push({ key: 'pool:other', title: 'Other', fullData: g.other });
    }

    for (const book of ALL_WORDBOOKS) {
      if (book.kind !== 'scenario') continue;
      const fd = g.wordbooks.get(book.id);
      if (!fd?.length) continue;
      sections.push({
        key: `wb:scenario:${book.id}`,
        title: `${book.emoji} ${book.nameEn}`,
        fullData: fd,
        practiceEntryContentId: fd[0]?.id,
      });
    }

    return sections;
  }, [displayedContents, activeViewTab]);

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      for (const s of baseSections) {
        if (!next.has(s.key)) next.add(s.key);
      }
      return next;
    });
  }, [baseSections]);

  const toggleSection = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const listSections: LibrarySection[] = useMemo(
    () =>
      baseSections.map((s) => ({
        ...s,
        data: expandedKeys.has(s.key) ? s.fullData : [],
      })),
    [baseSections, expandedKeys],
  );

  const viewTabLabel = (tab: ViewTab): string => {
    switch (tab) {
      case 'all':
        return 'All';
      case 'wordbook':
        return 'Wordbook';
      case 'book':
        return 'Book';
      case 'phrase':
        return 'Phrase';
      case 'sentence':
        return 'Sentence';
      case 'article':
        return 'Article';
      case 'scenario':
        return 'Scenario';
      default:
        return tab;
    }
  };

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

  const handleBatchTag = async () => {
    const nextTags = batchTagInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (nextTags.length === 0) return;

    for (const id of selectedIds) {
      const content = contents.find((item) => item.id === id);
      if (!content) continue;
      const merged = Array.from(new Set([...content.tags, ...nextTags]));
      await updateContent(id, { tags: merged });
    }

    setBatchTagInput('');
    setShowBatchTagInput(false);
    void haptics.success();
  };

  const editingContent = editingContentId ? contents.find((c) => c.id === editingContentId) : null;

  return (
    <Screen padding={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with gradient */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View>
              <Text variant="headlineMedium" style={[styles.headerTitle, { color: colors.onPrimary }]}>
                Library
              </Text>
              <Text variant="bodySmall" style={[styles.headerSubtitle, { color: colors.onPrimary }]}>
                {displayedContents.length} {displayedContents.length === 1 ? 'item' : 'items'}
              </Text>
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
            void haptics.light();
            router.push('/wordbooks' as Href);
          }}
        >
          <View style={[styles.wordbooksIcon, { backgroundColor: vocabularyModuleColors.background }]}>
            <MaterialCommunityIcons name="card-text-outline" size={20} color={vocabularyModuleColors.primary} />
          </View>
          <Text variant="titleSmall" style={[styles.wordbooksTitle, { color: colors.onSurface }]}>
            Wordbooks
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
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

        {/* Compact filters row: Type + Difficulty + Advanced button */}
        <View style={styles.compactFiltersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {/* View Tabs */}
            {(['all', 'wordbook', 'book', 'phrase', 'sentence', 'article', 'scenario'] as ViewTab[]).map((tab) => (
              <Chip
                key={tab}
                mode={activeViewTab === tab ? 'flat' : 'outlined'}
                selected={activeViewTab === tab}
                onPress={() => setActiveViewTab(tab)}
                style={[styles.compactChip, activeViewTab === tab && { backgroundColor: colors.primary }]}
                textStyle={[styles.compactChipText, activeViewTab === tab && { color: colors.onPrimary }]}
                compact
              >
                {viewTabLabel(tab)}
              </Chip>
            ))}

            <Divider style={[styles.filterDivider, { backgroundColor: colors.borderLight }]} />

            {/* Difficulty Filter */}
            {(['', 'beginner', 'intermediate', 'advanced'] as const).map((diff) => (
              <Chip
                key={diff || 'all-diff'}
                mode={difficultyFilter === diff ? 'flat' : 'outlined'}
                selected={difficultyFilter === diff}
                onPress={() => setDifficultyFilter(diff as DifficultyLevel | '')}
                style={[styles.compactChip, difficultyFilter === diff && { backgroundColor: colors.primary }]}
                textStyle={[styles.compactChipText, difficultyFilter === diff && { color: colors.onPrimary }]}
                compact
              >
                {diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : 'All Levels'}
              </Chip>
            ))}

            <Divider style={[styles.filterDivider, { backgroundColor: colors.borderLight }]} />

            {/* Favorites */}
            <Chip
              icon={showStarredOnly ? 'heart' : 'heart-outline'}
              mode={showStarredOnly ? 'flat' : 'outlined'}
              selected={showStarredOnly}
              onPress={() => {
                void haptics.light();
                setShowStarredOnly(!showStarredOnly);
              }}
              style={[styles.compactChip, showStarredOnly && { backgroundColor: colors.accentPink }]}
              textStyle={showStarredOnly && { color: colors.onPrimary }}
              compact
            >
              Favorites
            </Chip>
          </ScrollView>

          {/* Advanced Filters Button */}
          <IconButton
            icon={showAdvancedFilters ? 'filter' : 'filter-outline'}
            iconColor={
              showAdvancedFilters || filterTags.length > 0 || viewMode === 'media'
                ? colors.primary
                : colors.onSurfaceVariant
            }
            size={20}
            onPress={() => {
              void haptics.light();
              setShowAdvancedFilters(!showAdvancedFilters);
            }}
            style={styles.advancedFilterButton}
          />
        </View>

        {/* Advanced Filters (collapsible) */}
        {showAdvancedFilters && (
          <View style={styles.advancedFiltersContainer}>
            {/* View Mode */}
            <View style={styles.advancedFilterRow}>
              <Text variant="labelSmall" style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>
                Content Type
              </Text>
              <View style={styles.filterGroup}>
                <Chip
                  mode={viewMode === 'all' ? 'flat' : 'outlined'}
                  selected={viewMode === 'all'}
                  onPress={() => setViewMode('all')}
                  style={[styles.compactChip, viewMode === 'all' && { backgroundColor: colors.primary }]}
                  textStyle={[styles.compactChipText, viewMode === 'all' && { color: colors.onPrimary }]}
                  compact
                >
                  All
                </Chip>
                <Chip
                  mode={viewMode === 'media' ? 'flat' : 'outlined'}
                  selected={viewMode === 'media'}
                  onPress={() => setViewMode('media')}
                  icon="video"
                  style={[styles.compactChip, viewMode === 'media' && { backgroundColor: colors.primary }]}
                  textStyle={[styles.compactChipText, viewMode === 'media' && { color: colors.onPrimary }]}
                  compact
                >
                  Media
                </Chip>
              </View>
            </View>

            {/* Tags */}
            {allTags.length > 0 && (
              <View style={styles.advancedFilterRow}>
                <Text variant="labelSmall" style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>
                  Tags
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {allTags.map((tag) => (
                    <Chip
                      key={tag}
                      mode={filterTags.includes(tag) ? 'flat' : 'outlined'}
                      selected={filterTags.includes(tag)}
                      onPress={() => toggleTag(tag)}
                      style={[styles.compactChip, filterTags.includes(tag) && { backgroundColor: colors.primary }]}
                      textStyle={[styles.compactChipText, filterTags.includes(tag) && { color: colors.onPrimary }]}
                      compact
                    >
                      {tag}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Practice intent banner */}
        {mode ? (
          <View style={styles.intentBanner}>
            <MvpNoticeCard
              title={`Pick content for ${mode === 'read' ? 'Read' : 'Write'}`}
              body="Choose a saved text below to continue into the selected practice mode."
            />
          </View>
        ) : null}

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
                  setShowBatchTagInput(false);
                  setBatchTagInput('');
                }}
                icon="delete"
                compact
                textColor={colors.error}
                style={styles.batchActionButton}
              >
                Delete
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  void haptics.light();
                  setShowBatchTagInput((value) => !value);
                }}
                icon="tag"
                compact
                textColor={colors.onPrimary}
                style={[styles.batchActionButton, { borderColor: `${colors.onPrimary}55` }]}
              >
                Tag
              </Button>
            </View>
          </View>
        )}

        {selectMode && selectedIds.size > 0 && showBatchTagInput && (
          <View style={[styles.batchTagPanel, { backgroundColor: colors.surface }]}>
            <Text variant="labelMedium" style={{ color: colors.onSurface, marginBottom: 8 }}>
              Add tags to selected items
            </Text>
            <TextInput
              style={[
                styles.batchTagInput,
                {
                  color: colors.onSurface,
                  borderColor: colors.borderLight,
                  backgroundColor: colors.background,
                },
              ]}
              value={batchTagInput}
              onChangeText={setBatchTagInput}
              placeholder="tag1, tag2, tag3"
              placeholderTextColor={colors.onSurfaceVariant}
            />
            <View style={styles.batchTagActions}>
              <Button
                mode="text"
                compact
                onPress={() => {
                  setShowBatchTagInput(false);
                  setBatchTagInput('');
                }}
              >
                Cancel
              </Button>
              <Button mode="contained" compact onPress={() => void handleBatchTag()}>
                Apply
              </Button>
            </View>
          </View>
        )}

        {/* Content list */}
        {baseSections.length === 0 ? (
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
          <SectionList
            sections={listSections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => {
              const meta = section as LibrarySection;
              return (
                <LibrarySectionHeader
                  title={meta.title}
                  count={meta.fullData.length}
                  expanded={expandedKeys.has(meta.key)}
                  onToggle={() => toggleSection(meta.key)}
                  practiceEntryContentId={meta.practiceEntryContentId}
                />
              );
            }}
            renderItem={({ item }) => (
              <View style={styles.sectionItemWrap}>
                <ContentCard
                  content={item}
                  onPress={() => handleContentPress(item.id)}
                  onToggleStarred={() => toggleStarred(item.id)}
                  onEdit={handleEdit}
                  onDelete={async (id) => {
                    await deleteContent(id);
                  }}
                  onUpdateTags={async (id, tags) => {
                    await updateContent(id, { tags });
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
              </View>
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}

        {/* Import FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
          onPress={() => {
            void haptics.light();
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
    paddingTop: 48,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  wordbooksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    padding: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 8,
  },
  wordbooksIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordbooksTitle: {
    flex: 1,
    fontFamily: fontFamily.heading,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.headingBold,
    fontWeight: 'bold',
    fontSize: 28,
  },
  headerSubtitle: {
    opacity: 0.9,
    fontSize: 13,
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
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
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
    padding: 10,
    fontSize: 15,
  },
  compactFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    marginBottom: 6,
  },
  filtersScroll: {
    flex: 1,
  },
  compactChip: {
    marginRight: 6,
    borderRadius: 16,
    height: 28,
  },
  compactChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  advancedFilterButton: {
    margin: 0,
    marginRight: 8,
  },
  advancedFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
  },
  advancedFilterRow: {
    marginBottom: 8,
  },
  filterLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterDivider: {
    width: 1,
    height: 20,
    alignSelf: 'center',
    marginHorizontal: 8,
  },
  intentBanner: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  batchTagPanel: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  batchTagInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  batchTagActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 140,
  },
  sectionItemWrap: {
    paddingHorizontal: 12,
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
