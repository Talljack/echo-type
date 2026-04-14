import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Chip, IconButton, Text } from 'react-native-paper';
import type { Content } from '@/types/content';

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  onToggleFavorite?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ContentCard({ content, onPress, onToggleFavorite, onEdit }: ContentCardProps) {
  const difficultyColors = {
    beginner: '#10B981',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
  };

  const textContent = content.text || content.content;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open ${content.title}`}
    >
      {content.coverImage && <Image source={{ uri: content.coverImage }} style={styles.thumbnail} resizeMode="cover" />}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
            {content.title}
          </Text>
          <View style={styles.headerRight}>
            {content.source && (
              <Text variant="labelSmall" style={styles.source}>
                {content.source.toUpperCase()}
              </Text>
            )}
            {onEdit && (
              <IconButton
                icon="pencil"
                iconColor="#6B7280"
                size={20}
                onPress={() => onEdit(content.id)}
                style={styles.editButton}
              />
            )}
            {onToggleFavorite && (
              <IconButton
                icon={content.isFavorite ? 'heart' : 'heart-outline'}
                iconColor={content.isFavorite ? '#EF4444' : '#9CA3AF'}
                size={20}
                onPress={() => onToggleFavorite(content.id)}
                style={styles.favoriteButton}
              />
            )}
          </View>
        </View>

        <Text variant="bodySmall" style={styles.text} numberOfLines={3}>
          {textContent}
        </Text>

        <View style={styles.footer}>
          <View style={styles.tags}>
            <Chip
              mode="flat"
              style={[styles.difficultyChip, { backgroundColor: difficultyColors[content.difficulty] }]}
              textStyle={styles.difficultyText}
            >
              {content.difficulty}
            </Chip>
            {content.tags.slice(0, 2).map((tag) => (
              <Chip key={tag} mode="outlined" style={styles.tag}>
                {tag}
              </Chip>
            ))}
          </View>

          <Text variant="labelSmall" style={styles.date}>
            {formatDistanceToNow(content.createdAt, { addSuffix: true })}
          </Text>
        </View>

        {content.wordCount && (
          <Text variant="labelSmall" style={styles.wordCount}>
            {content.wordCount.toLocaleString()} words
          </Text>
        )}

        {content.fsrsCard && (
          <Text variant="labelSmall" style={styles.fsrsInfo}>
            Next review: {new Date(content.fsrsCard.due).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
    marginRight: 8,
  },
  source: {
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  favoriteButton: {
    margin: 0,
  },
  editButton: {
    margin: 0,
  },
  text: {
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  difficultyChip: {
    height: 24,
  },
  difficultyText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tag: {
    height: 24,
  },
  date: {
    color: '#9CA3AF',
  },
  wordCount: {
    color: '#9CA3AF',
  },
  fsrsInfo: {
    color: '#6366F1',
    fontWeight: '500',
    marginTop: 4,
  },
});
