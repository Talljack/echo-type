import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { streamChatResponse } from '@/services/chat-api';
import { useChatStore } from '@/stores/useChatStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const QUICK_ACTIONS = [
  { label: 'Practice recommendations', prompt: 'Look at my library and suggest what I should practice next.' },
  {
    label: 'Translate this',
    prompt: 'I will paste text next—translate it to my target language and explain tricky words.',
  },
  { label: 'Explain grammar', prompt: 'Explain English grammar clearly with short examples at my level.' },
  { label: 'Quiz me', prompt: 'Give me a short English quiz (5 questions), then check my answers.' },
] as const;

export default function ChatDetailScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, addMessage, updateLastAssistantMessage, updateMessage, isLoading, setIsLoading } =
    useChatStore();
  const showAiSetupNotice = useSettingsStore((s) => !s.settings.aiProvider?.trim());
  const flatListRef = useRef<FlatList>(null);
  const toolStatusLineIds = useRef<Map<string, string>>(new Map());

  const conversation = conversations.find((c) => c.id === id);
  const visibleMessages = conversation?.messages.filter((m) => m.role !== 'system') || [];

  useEffect(() => {
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
    toolStatusLineIds.current = new Map();

    addMessage(id, 'assistant', '');

    const conv = useChatStore.getState().conversations.find((c) => c.id === id);
    let forApi = (conv?.messages || []).filter((m) => m.role !== 'system' && m.role !== 'tool');
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

    await streamChatResponse(
      allMessages,
      {
        onToken: (token) => {
          updateLastAssistantMessage(id, token);
        },
        onDone: () => {
          setIsLoading(false);
        },
        onError: (error) => {
          updateLastAssistantMessage(id, `Error: ${error.message}`);
          setIsLoading(false);
        },
        onBeforeToolFollowUp: () => {
          updateLastAssistantMessage(id, '');
        },
        onToolStatus: ({ toolName, toolCallId, phase }) => {
          if (phase === 'start') {
            const lineId = addMessage(id, 'tool', `Using tool: ${toolName}`);
            toolStatusLineIds.current.set(toolCallId, lineId);
          } else {
            const lineId = toolStatusLineIds.current.get(toolCallId);
            if (lineId) {
              updateMessage(id, lineId, `Finished tool: ${toolName}`);
              toolStatusLineIds.current.delete(toolCallId);
            }
          }
        },
      },
      { enableMobileTools: true },
    );
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

      <View style={[styles.quickWrap, { borderTopColor: colors.borderLight }]}>
        <Text variant="labelSmall" style={[styles.quickLabel, { color: colors.onSurfaceSecondary }]}>
          Quick actions
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              disabled={isLoading}
              onPress={() => void handleSend(action.prompt)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                  opacity: isLoading ? 0.45 : pressed ? 0.88 : 1,
                  ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' as const } : {}),
                },
              ]}
            >
              <Text variant="labelLarge" style={{ color: colors.onSurface }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ChatInput onSend={(t) => void handleSend(t)} disabled={isLoading} showVoiceButton />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  quickWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  quickLabel: {
    marginBottom: 6,
    marginLeft: 4,
  },
  quickScroll: {
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
});
