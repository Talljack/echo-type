import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { isAiChatConfigured } from '@/lib/ai-providers';
import { haptics } from '@/lib/haptics';
import { streamChatResponse } from '@/services/chat-api';
import { useChatStore } from '@/stores/useChatStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

const QUICK_ACTIONS = [
  { label: 'Practice ideas', prompt: 'Look at my library and suggest what I should practice next.' },
  { label: 'Translate', prompt: 'I will paste text next—translate it to my target language and explain tricky words.' },
  { label: 'Explain grammar', prompt: 'Explain English grammar clearly with short examples at my level.' },
  { label: 'Quiz me', prompt: 'Give me a short English quiz (5 questions), then check my answers.' },
] as const;

export default function ChatDetailScreen() {
  const { colors } = useAppTheme();
  const { id, initialPrompt } = useLocalSearchParams<{ id: string; initialPrompt?: string }>();
  const conversations = useChatStore((s) => s.conversations);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastAssistantMessage = useChatStore((s) => s.updateLastAssistantMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const togglePin = useChatStore((s) => s.togglePin);
  const dismissNotice = useChatStore((s) => s.dismissNotice);
  const isLoading = useChatStore((s) => s.isLoading);
  const setIsLoading = useChatStore((s) => s.setIsLoading);
  const showAiSetupNotice = useSettingsStore((s) => !isAiChatConfigured(s.settings));
  const flatListRef = useRef<FlatList>(null);
  const toolStatusLineIds = useRef<Map<string, string>>(new Map());
  const initialPromptHandled = useRef(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const conversation = conversations.find((c) => c.id === id);
  const visibleMessages = conversation?.messages.filter((m) => m.role !== 'system') || [];
  const noticeVisible = showAiSetupNotice && !conversation?.noticeDismissed;

  useEffect(() => {
    if (flatListRef.current && visibleMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    setShowQuickActions(visibleMessages.length === 0);
  }, [visibleMessages.length]);

  const handleSend = async (text: string) => {
    if (!id) return;

    addMessage(id, 'user', text);

    const { settings } = useSettingsStore.getState();

    if (!isAiChatConfigured(settings)) {
      addMessage(
        id,
        'assistant',
        '⚠️ AI provider not configured.\n\nGo to Settings → AI Provider to set up your provider, API key (if required), and model.',
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
          void haptics.success();
        },
        onError: (error) => {
          updateLastAssistantMessage(id, `Error: ${error.message}`);
          setIsLoading(false);
          void haptics.error();
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

  // Auto-send the topic starter prompt when arriving via topic card
  useEffect(() => {
    if (initialPrompt && !initialPromptHandled.current && conversation && visibleMessages.length === 0) {
      initialPromptHandled.current = true;
      void handleSend(String(initialPrompt));
    }
  }, [initialPrompt, conversation, visibleMessages.length]);

  const handleRename = () => {
    if (!conversation) return;
    Alert.prompt(
      'Rename conversation',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            if (text) renameConversation(conversation.id, text);
          },
        },
      ],
      'plain-text',
      conversation.title,
    );
  };

  const handleClearMessages = () => {
    if (!conversation) return;
    Alert.alert('Clear all messages?', 'The conversation will be empty but kept in your list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearMessages(conversation.id);
          void haptics.warning();
        },
      },
    ]);
  };

  const showHeaderMenu = () => {
    if (!conversation) return;
    void haptics.medium();
    Alert.alert(conversation.title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rename', onPress: handleRename },
      { text: conversation.pinned ? 'Unpin' : 'Pin', onPress: () => togglePin(conversation.id) },
      { text: 'Clear messages', style: 'destructive', onPress: handleClearMessages },
    ]);
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
          headerRight: () => (
            <Pressable
              onPress={showHeaderMenu}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Conversation actions"
              style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
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
          noticeVisible ? (
            <View style={styles.noticeContainer}>
              <MvpNoticeCard
                title="Configure AI Provider"
                body="Go to Settings → AI Provider to add your API key. Once configured, you'll get real AI responses."
              />
              <Pressable
                onPress={() => dismissNotice(conversation.id)}
                style={[styles.dismissBanner, { backgroundColor: colors.surfaceVariant }]}
                accessibilityRole="button"
                accessibilityLabel="Dismiss banner"
              >
                <Text variant="labelMedium" style={{ color: colors.onSurfaceSecondary }}>
                  Dismiss
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}>
              <MaterialCommunityIcons name="chat-processing-outline" size={32} color={colors.primary} />
            </View>
            <Text variant="titleMedium" style={[styles.emptyChatTitle, { color: colors.onSurface }]}>
              Say hello to your tutor
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceSecondary, textAlign: 'center' }}>
              Use a quick action below or type your own question.
            </Text>
          </View>
        }
      />

      {isLoading ? (
        <View style={styles.typingIndicator}>
          <Text variant="bodySmall" style={[styles.typingText, { color: colors.primary }]}>
            AI Tutor is typing...
          </Text>
        </View>
      ) : null}

      {showQuickActions ? (
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
      ) : null}

      <ChatInput onSend={(t) => void handleSend(t)} disabled={isLoading} showVoiceButton />
    </KeyboardAvoidingView>
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
  noticeContainer: {
    marginBottom: 16,
  },
  dismissBanner: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderCurve: 'continuous',
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
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyChatTitle: {
    fontWeight: '600',
    marginBottom: 6,
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
