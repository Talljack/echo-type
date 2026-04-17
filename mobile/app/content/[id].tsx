import * as Haptics from 'expo-haptics';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { EditContentModal } from '@/components/library/EditContentModal';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getPracticeActions } from '@/features/content/get-practice-actions';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { fontFamily } from '@/theme/typography';

export default function ContentDetailScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.contents.find((c) => c.id === id));
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const deleteContent = useLibraryStore((state) => state.deleteContent);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleDelete = () => {
    Alert.alert('Delete Content', 'Are you sure you want to delete this content? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteContent(id);
          router.back();
        },
      },
    ]);
  };

  if (!content) {
    return (
      <Screen>
        <MvpNoticeCard title="Content not found" body="The selected content item no longer exists in local storage." />
      </Screen>
    );
  }

  const difficultyColors = {
    beginner: '#34C759',
    intermediate: '#FF9500',
    advanced: '#FF3B30',
  };

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.onSurface }]}>
            {content.title}
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon={content.isFavorite ? 'heart' : 'heart-outline'}
              iconColor={content.isFavorite ? '#FF2D55' : colors.onSurfaceVariant}
              size={24}
              onPress={() => toggleFavorite(id)}
            />
            <IconButton
              icon="pencil"
              size={24}
              iconColor={colors.onSurfaceVariant}
              onPress={() => setEditModalVisible(true)}
            />
            <IconButton icon="delete" size={24} iconColor="#FF3B30" onPress={handleDelete} />
          </View>
        </View>

        {/* Meta info */}
        <View style={styles.metaContainer}>
          <Chip
            icon="file-document"
            style={[styles.chip, { backgroundColor: colors.surfaceVariant }]}
            textStyle={{ color: colors.onSurfaceVariant }}
          >
            {content.source?.toUpperCase() || 'TEXT'}
          </Chip>
          <Chip
            icon="signal"
            style={[styles.chip, { backgroundColor: difficultyColors[content.difficulty] + '20' }]}
            textStyle={{ color: difficultyColors[content.difficulty] }}
          >
            {content.difficulty}
          </Chip>
          <Chip
            icon="text"
            style={[styles.chip, { backgroundColor: colors.surfaceVariant }]}
            textStyle={{ color: colors.onSurfaceVariant }}
          >
            {content.wordCount || 0} words
          </Chip>
        </View>

        {/* Content body */}
        <View style={[styles.bodyContainer, { backgroundColor: colors.surface }]}>
          <Text variant="bodyLarge" style={[styles.body, { color: colors.onSurface }]}>
            {content.text || content.content}
          </Text>
        </View>

        {/* Practice actions */}
        <View style={styles.actions}>
          <Text variant="titleMedium" style={[styles.actionsTitle, { color: colors.onSurface }]}>
            Practice with this content
          </Text>
          {getPracticeActions(content.id).map((action) => {
            const actionColors = {
              listen: getModuleColors('listen'),
              speak: getModuleColors('speak'),
              read: getModuleColors('read'),
              write: getModuleColors('write'),
            };
            const moduleKey = action.key.replace('practice-', '') as keyof typeof actionColors;
            const moduleColors = actionColors[moduleKey] || getModuleColors('library');

            return (
              <Button
                key={action.key}
                mode="contained"
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(action.route as Href);
                }}
                style={[styles.actionButton, { backgroundColor: moduleColors.primary }]}
                labelStyle={{ color: '#FFFFFF' }}
                icon={
                  action.key.includes('listen')
                    ? 'headphones'
                    : action.key.includes('speak')
                      ? 'microphone'
                      : action.key.includes('read')
                        ? 'book-open-variant'
                        : 'pencil'
                }
              >
                {action.label}
              </Button>
            );
          })}
        </View>
      </ScrollView>

      <EditContentModal visible={editModalVisible} content={content} onDismiss={() => setEditModalVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.headingBold,
    fontWeight: '700',
    flex: 1,
    lineHeight: 32,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  bodyContainer: {
    padding: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  body: {
    lineHeight: 28,
    fontSize: 16,
  },
  actions: {
    gap: 12,
  },
  actionsTitle: {
    fontFamily: fontFamily.heading,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionButton: {
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
