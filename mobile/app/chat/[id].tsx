import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { MvpNoticeCard } from '@/components/ui/MvpNoticeCard';
import { useChatStore } from '@/stores/useChatStore';

// Simple AI response generator (placeholder for real API integration)
function generateAIResponse(userMessage: string): string {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return "Hello! It's great to chat with you. How are you doing today? Feel free to practice your English with me - I'm here to help!";
  }

  if (lowerMsg.includes('help') || lowerMsg.includes('practice')) {
    return "I'd love to help you practice! We can:\n\n1. Have a free conversation on any topic\n2. Practice specific grammar points\n3. Do vocabulary exercises\n4. Role-play real-life situations\n\nWhat would you like to do?";
  }

  if (lowerMsg.includes('grammar')) {
    return "Great choice! Let's work on grammar. Try making a sentence using the present perfect tense (e.g., 'I have visited...'). I'll check it and give you feedback!";
  }

  if (lowerMsg.includes('vocabulary') || lowerMsg.includes('word')) {
    return "Let's expand your vocabulary! Here's a word for today:\n\n**Resilient** (adjective) - able to recover quickly from difficult situations.\n\nExample: 'She is very resilient and always bounces back from setbacks.'\n\nCan you try using this word in your own sentence?";
  }

  if (lowerMsg.includes('thank')) {
    return "You're welcome! Remember, the best way to improve is consistent practice. Keep up the great work! Is there anything else you'd like to practice?";
  }

  // Default response with gentle correction hints
  const responses = [
    `That's a great effort! Let me give you some feedback:\n\nYour message: "${userMessage}"\n\nYou're doing well with your communication. Keep practicing! What would you like to talk about next?`,
    `I understand what you're saying. Here's a tip: try to use more varied sentence structures. For example, instead of simple sentences, try connecting ideas with words like "however," "although," or "therefore."\n\nWhat else would you like to discuss?`,
    `Good job expressing yourself! A small suggestion: pay attention to your use of articles (a, an, the). They're tricky in English but very important.\n\nLet's keep the conversation going - tell me about your day!`,
    `Nice message! Here's something to keep in mind: in English, we often use contractions in casual conversation (e.g., "I'm" instead of "I am", "don't" instead of "do not").\n\nWhat topic interests you the most?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, addMessage, isLoading, setIsLoading } = useChatStore();
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
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(
      () => {
        const response = generateAIResponse(text);
        addMessage(id, 'assistant', response);
        setIsLoading(false);
      },
      800 + Math.random() * 1200,
    );
  };

  if (!conversation) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Chat Not Found" />
        </Appbar.Header>
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">This conversation does not exist.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={conversation.title} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.noticeContainer}>
            <MvpNoticeCard
              title="Local demo responses"
              body="This chat screen keeps the conversation shell and local history, but it does not call a live AI provider in the current mobile MVP."
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text variant="titleMedium" style={styles.emptyChatTitle}>
              Start chatting!
            </Text>
            <Text variant="bodyMedium" style={styles.emptyChatText}>
              Say hello to your AI English tutor
            </Text>
          </View>
        }
      />

      {isLoading && (
        <View style={styles.typingIndicator}>
          <Text variant="bodySmall" style={styles.typingText}>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
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
    color: '#374151',
    marginBottom: 8,
  },
  emptyChatText: {
    color: '#6B7280',
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    color: '#6366F1',
    fontStyle: 'italic',
  },
});
