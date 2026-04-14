import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { ConversationList } from '@/components/chat/ConversationList';
import { Screen } from '@/components/layout/Screen';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useChatStore } from '@/stores/useChatStore';

export default function ChatScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const aiColors = getModuleColors('ai');
  const { conversations, createConversation, deleteConversation, setCurrentConversation } = useChatStore();

  const handleNewChat = () => {
    const id = createConversation();
    router.push(`/chat/${id}`);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversation(id);
    router.push(`/chat/${id}`);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ConversationList
          conversations={conversations}
          onSelect={handleSelectConversation}
          onDelete={handleDeleteConversation}
          onNew={handleNewChat}
        />
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: aiColors.primary }]}
          onPress={handleNewChat}
          color="#FFFFFF"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    borderRadius: 16,
  },
});
