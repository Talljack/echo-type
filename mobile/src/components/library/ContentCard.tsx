import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Chip, IconButton, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { createAccessibilityLabel, formatProgressForA11y, MIN_TOUCH_TARGET_SIZE } from '@/lib/accessibility';
import { ALL_WORDBOOK_IDS, getWordBook } from '@/lib/wordbooks';
import { componentRadius, radius } from '@/theme/radius';
import { shadows } from '@/theme/shadows';
import { componentSpacing, spacing } from '@/theme/spacing';
import type { Content, ContentType } from '@/types/content';

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  onToggleFavorite: () => void;
  onEdit?: (contentId: string) => void;
  onDelete?: (contentId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (contentId: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TYPE_ACCENTS: Partial<Record<ContentType, string>> & { default: string } = {
  word: '#6366F1',
  phrase: '#8B5CF6',
  sentence: '#EC4899',
  article: '#F59E0B',
  default: '#4F46E5',
};

function typeAccentFor(contentType: ContentType): string {
  return TYPE_ACCENTS[contentType] ?? TYPE_ACCENTS.default;
}

function typeLabel(type: ContentType): string {
  switch (type) {
    case 'word':
      return 'Word';
    case 'phrase':
      return 'Phrase';
    case 'sentence':
      return 'Sentence';
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'book':
      return 'Book';
    case 'conversation':
      return 'Chat';
    default:
      return type;
  }
}

export function ContentCard({
  content,
  onPress,
  onToggleFavorite,
  onEdit,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
}: ContentCardProps) {
  const { colors, isDark, getModuleColors } = useAppTheme();
  const listenColors = getModuleColors('listen');
  const readColors = getModuleColors('read');
  const writeColors = getModuleColors('write');
  const scale = useSharedValue(1);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const wordbookMeta = useMemo(() => {
    const cat = content.category;
    if (!cat || !ALL_WORDBOOK_IDS.includes(cat)) return undefined;
    return getWordBook(cat);
  }, [content.category]);

  const accentColor = typeAccentFor(content.type);

  const difficultySurface = useMemo(() => {
    switch (content.difficulty) {
      case 'beginner':
        return { bg: colors.success, fg: colors.onSuccess };
      case 'intermediate':
        return { bg: colors.warning, fg: colors.onWarning };
      case 'advanced':
        return { bg: colors.error, fg: colors.onError };
      default:
        return { bg: colors.success, fg: colors.onSuccess };
    }
  }, [colors, content.difficulty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const selectedCardStyle = {
    borderColor: colors.primaryLight,
    backgroundColor: isDark ? 'rgba(129, 140, 248, 0.14)' : colors.primaryContainer,
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(content.id);
    } else {
      onPress();
    }
  };

  const handleStartEditTags = () => {
    setTagInput(content.tags.join(', '));
    setEditingTags(true);
  };

  const handleSaveTags = () => {
    // This would need to be passed from parent
    // For now, just close the editor
    setEditingTags(false);
  };

  const getPreviewText = () => {
    const maxLength = content.type === 'article' ? 150 : content.type === 'sentence' ? 100 : 60;
    if (content.text.length <= maxLength) return content.text;
    return `${content.text.slice(0, maxLength)}...`;
  };

  // Create accessible label
  const accessibilityLabel = createAccessibilityLabel([
    content.title,
    `Difficulty: ${content.difficulty}`,
    `Language: ${content.language}`,
    content.progress > 0 ? formatProgressForA11y(content.progress, 100) : undefined,
    content.isFavorite ? 'Favorited' : undefined,
  ]);

  const favoriteHint = content.isFavorite ? 'Double tap to remove from favorites' : 'Double tap to add to favorites';

  return (
    <AnimatedPressable
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        animatedStyle,
        selected && styles.cardSelected,
        selected && selectedCardStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view content details"
    >
      <View style={styles.cardInner}>
        <View style={[styles.typeAccent, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            {selectable && (
              <IconButton
                icon={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                onPress={(e) => {
                  e?.stopPropagation();
                  onToggleSelect?.(content.id);
                }}
                iconColor={selected ? colors.primaryLight : colors.onSurfaceVariant}
                style={styles.selectButton}
              />
            )}
            <View style={styles.headerContent}>
              <View style={styles.titleBlock}>
                <Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]} numberOfLines={2}>
                  {content.title}
                </Text>
                {wordbookMeta ? (
                  <Text variant="labelSmall" style={[styles.wordbookSubtitle, { color: colors.onSurfaceVariant }]}>
                    {wordbookMeta.emoji} {wordbookMeta.nameEn}
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon={content.isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                onPress={(e) => {
                  e?.stopPropagation();
                  onToggleFavorite();
                }}
                iconColor={content.isFavorite ? colors.error : colors.onSurfaceVariant}
                style={styles.favoriteButton}
                accessibilityLabel={content.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                accessibilityRole="button"
                accessibilityHint={favoriteHint}
                accessibilityState={{ checked: content.isFavorite }}
              />
            </View>
          </View>

          {/* Preview Text */}
          <Text variant="bodySmall" style={[styles.previewText, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
            {getPreviewText()}
          </Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            {/* Difficulty Badge */}
            <View style={[styles.difficultyBadge, { backgroundColor: difficultySurface.bg }]}>
              <Text style={[styles.difficultyText, { color: difficultySurface.fg }]}>{content.difficulty}</Text>
            </View>

            {/* Type badge */}
            <View style={[styles.typeBadge, { borderColor: accentColor, backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.typeBadgeText, { color: accentColor }]}>{typeLabel(content.type)}</Text>
            </View>

            {/* Media Icon */}
            {(content.source === 'youtube' || content.source === 'local-media') && (
              <IconButton icon="video" size={16} iconColor={colors.accentPurple} style={styles.mediaIcon} />
            )}

            {/* Category (hide raw id when wordbook subtitle is shown) */}
            {content.category && !wordbookMeta && (
              <Chip
                mode="outlined"
                compact
                style={[styles.categoryChip, { borderColor: colors.primaryLight }]}
                textStyle={[styles.categoryText, { color: colors.primaryLight }]}
              >
                {content.category}
              </Chip>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {editingTags ? (
              <View style={styles.tagEditContainer}>
                <TextInput
                  style={[
                    styles.tagInput,
                    {
                      borderColor: colors.borderLight,
                      color: colors.onSurface,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="tag1, tag2, tag3"
                  placeholderTextColor={colors.onSurfaceSecondary}
                  autoFocus
                />
                <IconButton icon="check" size={16} onPress={handleSaveTags} iconColor={colors.onSurfaceVariant} />
                <IconButton
                  icon="close"
                  size={16}
                  onPress={() => setEditingTags(false)}
                  iconColor={colors.onSurfaceVariant}
                />
              </View>
            ) : (
              <>
                {content.tags.slice(0, 3).map((tag) => (
                  <Chip
                    key={tag}
                    mode="outlined"
                    compact
                    style={[styles.tagChip, { borderColor: colors.borderLight }]}
                    textStyle={[styles.tagText, { color: colors.onSurfaceVariant }]}
                  >
                    {tag}
                  </Chip>
                ))}
                {content.tags.length > 3 && (
                  <Text style={[styles.moreTagsText, { color: colors.onSurfaceVariant }]}>
                    +{content.tags.length - 3}
                  </Text>
                )}
                <IconButton
                  icon="tag-plus"
                  size={16}
                  onPress={(e) => {
                    e?.stopPropagation();
                    handleStartEditTags();
                  }}
                  style={styles.addTagButton}
                  iconColor={colors.onSurfaceVariant}
                />
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <IconButton
              icon="headphones"
              size={20}
              onPress={(e) => {
                e?.stopPropagation();
                router.push(`/practice/listen/${content.id}`);
              }}
              iconColor={listenColors.primary}
              style={styles.actionButton}
              accessibilityLabel="Listen"
            />
            <IconButton
              icon="book-open-variant"
              size={20}
              onPress={(e) => {
                e?.stopPropagation();
                router.push(`/practice/read/${content.id}`);
              }}
              iconColor={readColors.primary}
              style={styles.actionButton}
              accessibilityLabel="Read"
            />
            <IconButton
              icon="pencil"
              size={20}
              onPress={(e) => {
                e?.stopPropagation();
                router.push(`/practice/write/${content.id}`);
              }}
              iconColor={writeColors.primary}
              style={styles.actionButton}
              accessibilityLabel="Write"
            />
            <View style={styles.actionsSpacer} />
            {onDelete && (
              <IconButton
                icon="delete"
                size={20}
                onPress={(e) => {
                  e?.stopPropagation();
                  onDelete(content.id);
                }}
                iconColor={colors.error}
                style={styles.actionButton}
                accessibilityLabel="Delete"
              />
            )}
          </View>

          {/* Progress Bar */}
          {content.progress > 0 && (
            <View
              style={[styles.progressBar, { backgroundColor: colors.borderLight }]}
              accessibilityRole="progressbar"
              accessibilityLabel="Reading progress"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: content.progress,
                text: `${Math.round(content.progress)}% complete`,
              }}
            >
              <View style={[styles.progressFill, { width: `${content.progress}%`, backgroundColor: colors.success }]} />
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: componentRadius.card,
    padding: 0,
    marginBottom: spacing.md,
    ...shadows.sm,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  typeAccent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: componentSpacing.cardPadding,
    paddingLeft: componentSpacing.cardPadding - 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  selectButton: {
    margin: 0,
    marginRight: spacing.xs,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontWeight: '600',
  },
  wordbookSubtitle: {
    marginTop: 2,
    fontWeight: '500',
  },
  favoriteButton: {
    margin: 0,
    minWidth: MIN_TOUCH_TARGET_SIZE,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  previewText: {
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mediaIcon: {
    margin: 0,
    width: 24,
    height: 24,
  },
  categoryChip: {
    height: 24,
  },
  categoryText: {
    fontSize: 11,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  tagEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  tagChip: {
    height: 24,
  },
  tagText: {
    fontSize: 11,
  },
  moreTagsText: {
    fontSize: 11,
  },
  addTagButton: {
    margin: 0,
    width: 24,
    height: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  actionButton: {
    margin: 0,
    width: 36,
    height: 36,
  },
  actionsSpacer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
});
