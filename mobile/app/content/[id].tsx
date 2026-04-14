import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Screen } from '@/components/layout/Screen';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { getPracticeActions } from '@/features/content/get-practice-actions';
import { useLibraryStore } from '@/stores/useLibraryStore';

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useLibraryStore((state) => state.contents.find((c) => c.id === id));

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
        <Text variant="headlineSmall" style={styles.title}>
          {content.title}
        </Text>
        <Text variant="bodyMedium" style={styles.meta}>
          {content.source.toUpperCase()} · {content.difficulty} · {content.metadata?.wordCount || 0} words
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          {content.text}
        </Text>
        <View style={styles.actions}>
          {getPracticeActions(content.id).map((action) => (
            <Button key={action.key} mode="contained" onPress={() => router.push(action.route as any)}>
              {action.label}
            </Button>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontWeight: '700' },
  meta: { color: '#6B7280' },
  body: { color: '#374151', lineHeight: 26 },
  actions: { gap: 12 },
});
