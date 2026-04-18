import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { streamChatResponse } from '@/services/chat-api';
import { useChatStore } from '@/stores/useChatStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function ChatDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, addMessage, updateLastAssistantMessage, isLoading, setIsLoading } = useChatStore();
  const showAiSetupNotice = useSettingsStore((s) => !s.settings.aiProvider?.trim());
  const flatListRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const visibleMessages = conversation?.messages.filter((m) => m.role !== 'system') || [];

  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current && visibleMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visibleMessages.length]);

  const handleSend = async (text: string) => {
    if (!id) return;

    addMessage(id, 'user', text);

    const { settings } = useSettingsStore.getState();

    if (!settings.aiProvider?.trim() || !settings.aiApiKey?.trim()) {
      addMessage(
        id,
        'assistant',
        '⚠️ AI provider not configured.\n\nGo to Settings → AI Provider to set up your API key and model.',
      );
      return;
    }

    setIsLoading(true);

    // Create placeholder assistant message for streaming
    addMessage(id, 'assistant', '');

    const conv = useChatStore.getState().conversations.find((c) => c.id === id);
    let forApi = (conv?.messages || []).filter((m) => m.role !== 'system');
    if (
      forApi.length > 0 &&
      forApi[forApi.length - 1].role === 'assistant' &&
      forApi[forApi.length - 1].content === ''
    ) {
      forApi = forApi.slice(0, -1);
    }

    const conversationMessages = forApi.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const allMessages = [
      {
        role: 'system' as const,
        content:
          'You are an English learning tutor. Help the user practice English through conversation. Be encouraging, correct mistakes gently, and explain grammar or vocabulary when relevant. Keep responses concise and conversational.',
      },
      ...conversationMessages,
    ];

    await streamChatResponse(allMessages, {
      onToken: (token) => {
        updateLastAssistantMessage(id, token);
      },
      onDone: (_fullText) => {
        setIsLoading(false);
      },
      onError: (error) => {
        updateLastAssistantMessage(id, `Error: ${error.message}`);
        setIsLoading(false);
      },
    });
  };

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
        <Stack.Screen options={{ headerShown: true, title: 'Chat Not Found', headerBackTitle: 'Back' }} />
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">This conversation does not exist.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surfaceVariant }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: conversation.title,
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          showAiSetupNotice ? (
            <View style={styles.noticeContainer}>
              <MvpNoticeCard
                title="Configure AI Provider"
                body="Go to Settings → AI Provider to add your API key. Once configured, you'll get real AI responses."
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text variant="titleMedium" style={[styles.emptyChatTitle, { color: colors.onSurface }]}>
              Start chatting!
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceSecondary }}>
              Say hello to your AI English tutor
            </Text>
          </View>
        }
      />

      {isLoading && (
        <View style={styles.typingIndicator}>
          <Text variant="bodySmall" style={[styles.typingText, { color: colors.primary }]}>
            AI Tutor is typing...
          </Text>
        </View>
      )}

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 2,
  },
  headerTitle: {
    fontWeight: '600',
  },
  noticeContainer: {
    marginBottom: 16,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyChatTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    fontStyle: 'italic',
  },
});
