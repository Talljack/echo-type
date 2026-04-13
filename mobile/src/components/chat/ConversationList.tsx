import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import type { Conversation } from '@/stores/useChatStore';

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({ conversations, onSelect, onDelete, onNew }: ConversationListProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          AI Tutor
        </Text>
        <IconButton icon="plus" size={24} iconColor="#6366F1" onPress={onNew} />
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Start a Conversation
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Chat with your AI English tutor to practice conversation skills
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => onSelect(item.id)} activeOpacity={0.7}>
              <View style={styles.itemContent}>
                <Text variant="bodyLarge" style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="bodySmall" style={styles.itemDate}>
                  {formatDate(item.updatedAt)} · {item.messages.filter((m) => m.role !== 'system').length} messages
                </Text>
              </View>
              <IconButton icon="delete-outline" size={20} iconColor="#9CA3AF" onPress={() => onDelete(item.id)} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: '#374151',
  },
  list: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemDate: {
    color: '#9CA3AF',
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
});
