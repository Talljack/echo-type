import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ConversationList } from '@/components/chat/ConversationList';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { useChatStore } from '@/stores/useChatStore';

export default function ChatScreen() {
  const { colors, getModuleColors } = useAppTheme();
  const aiColors = getModuleColors('ai');
  const { conversations, createConversation, deleteConversation, setCurrentConversation } = useChatStore();

  const handleNewChat = () => {
    void haptics.light();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'AI Tutor',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { fontWeight: '600' },
          headerRight: () => (
            <Pressable
              onPress={handleNewChat}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="plus-circle" size={28} color={aiColors.primary} />
            </Pressable>
          ),
        }}
      />
      <ConversationList
        conversations={conversations}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNew={handleNewChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
