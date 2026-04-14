import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { EditContentModal } from '@/components/library/EditContentModal';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { getPracticeActions } from '@/features/content/get-practice-actions';
import { useLibraryStore } from '@/stores/useLibraryStore';

export default function ContentDetailScreen() {
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

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {content.title}
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon={content.isFavorite ? 'heart' : 'heart-outline'}
              iconColor={content.isFavorite ? '#EF4444' : '#6B7280'}
              size={20}
              onPress={() => toggleFavorite(id)}
            />
            <IconButton icon="pencil" size={20} onPress={() => setEditModalVisible(true)} />
            <IconButton icon="delete" size={20} iconColor="#EF4444" onPress={handleDelete} />
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.meta}>
          {content.source?.toUpperCase() || 'TEXT'} · {content.difficulty} · {content.wordCount || 0} words
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          {content.text || content.content}
        </Text>
        <View style={styles.actions}>
          {getPracticeActions(content.id).map((action) => (
            <Button key={action.key} mode="contained" onPress={() => router.push(action.route as any)}>
              {action.label}
            </Button>
          ))}
        </View>
      </ScrollView>

      <EditContentModal visible={editModalVisible} content={content} onDismiss={() => setEditModalVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '700', flex: 1 },
  meta: { color: '#6B7280' },
  body: { color: '#374151', lineHeight: 26 },
  actions: { gap: 12 },
});
