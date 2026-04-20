import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { type Conversation, lastMessagePreview } from '@/stores/useChatStore';

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onTogglePin: (id: string) => void;
}

function formatRelative(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ConversationRow({
  conversation,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}: {
  conversation: Conversation;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const { colors } = useAppTheme();
  const preview = lastMessagePreview(conversation);

  const showActions = () => {
    void haptics.medium();
    Alert.alert(conversation.title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: conversation.pinned ? 'Unpin' : 'Pin',
        onPress: () => onTogglePin(conversation.id),
      },
      { text: 'Rename', onPress: () => onRename(conversation.id, conversation.title) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete this conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(conversation.id) },
    ]);
  };

  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        onSelect(conversation.id);
      }}
      onLongPress={showActions}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A` }]}>
        <MaterialCommunityIcons name={conversation.pinned ? 'pin' : 'message-text'} size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyLarge" style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.onSurfaceSecondary }}>
            {formatRelative(conversation.updatedAt)}
          </Text>
        </View>
        <Text variant="bodySmall" style={[styles.preview, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

export function ConversationList({ conversations, onSelect, onDelete, onRename, onTogglePin }: ConversationListProps) {
  const { colors } = useAppTheme();

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}>
          <MaterialCommunityIcons name="chat-outline" size={28} color={colors.primary} />
        </View>
        <Text variant="bodyMedium" style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
          No conversations yet. Start one above.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {conversations.map((conv) => (
        <ConversationRow
          key={conv.id}
          conversation={conv}
          onSelect={onSelect}
          onDelete={onDelete}
          onRename={onRename}
          onTogglePin={onTogglePin}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  preview: {
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
  },
});
