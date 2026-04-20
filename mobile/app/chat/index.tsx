import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { ConversationList } from '@/components/chat/ConversationList';
import { useAppTheme } from '@/contexts/ThemeContext';
import { haptics } from '@/lib/haptics';
import { sortConversations, useChatStore } from '@/stores/useChatStore';

interface TopicStarter {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  prompt: string;
  color: string;
}

// Topic colors are semantic and should remain fixed across themes
const TOPICS: TopicStarter[] = [
  {
    id: 'practice',
    title: 'Practice ideas',
    subtitle: 'Suggest what to learn next',
    icon: 'lightbulb-on',
    prompt: 'Look at my library and suggest what I should practice next.',
    color: '#22C55E', // green
  },
  {
    id: 'translate',
    title: 'Translate this',
    subtitle: 'Explain tricky words',
    icon: 'translate',
    prompt: 'I will paste text next—translate it to my target language and explain tricky words.',
    color: '#0EA5E9', // blue
  },
  {
    id: 'grammar',
    title: 'Explain grammar',
    subtitle: 'Short, leveled examples',
    icon: 'book-open-page-variant',
    prompt: 'Explain English grammar clearly with short examples at my level.',
    color: '#A855F7', // purple
  },
  {
    id: 'quiz',
    title: 'Quiz me',
    subtitle: '5 questions to check',
    icon: 'comment-question-outline',
    prompt: 'Give me a short English quiz (5 questions), then check my answers.',
    color: '#F59E0B', // amber
  },
];

export default function ChatScreen() {
  const { colors } = useAppTheme();
  const conversations = useChatStore((s) => s.conversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const togglePin = useChatStore((s) => s.togglePin);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const sorted = useMemo(() => sortConversations(conversations), [conversations]);

  const handleNewChat = () => {
    void haptics.light();
    const id = createConversation();
    router.push(`/chat/${id}`);
  };

  const handleStartTopic = (topic: TopicStarter) => {
    void haptics.light();
    const id = createConversation(topic.title);
    router.push({ pathname: '/chat/[id]', params: { id, initialPrompt: topic.prompt } });
  };

  const handleSelect = (id: string) => {
    setCurrentConversation(id);
    router.push(`/chat/${id}`);
  };

  const handleRename = (id: string, currentTitle: string) => {
    Alert.prompt(
      'Rename conversation',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (text?: string) => {
            if (text) renameConversation(id, text);
          },
        },
      ],
      'plain-text',
      currentTitle,
    );
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
              <MaterialCommunityIcons name="square-edit-outline" size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Text variant="titleMedium" style={[styles.heroLabel, { color: colors.onSurfaceSecondary }]}>
            START A NEW CHAT
          </Text>
          <View style={styles.topicsGrid}>
            {TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                onPress={() => handleStartTopic(topic)}
                style={({ pressed }) => [
                  styles.topicCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.topicIcon, { backgroundColor: `${topic.color}1F` }]}>
                  <MaterialCommunityIcons name={topic.icon} size={20} color={topic.color} />
                </View>
                <Text variant="bodyLarge" style={[styles.topicTitle, { color: colors.onSurface }]} numberOfLines={1}>
                  {topic.title}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceSecondary, marginTop: 2 }} numberOfLines={2}>
                  {topic.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [
              styles.blankChatRow,
              { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
            <Text variant="bodyMedium" style={[styles.blankChatText, { color: colors.primary }]}>
              Or start a blank chat
            </Text>
          </Pressable>
        </View>

        <Text variant="titleMedium" style={[styles.sectionLabel, { color: colors.onSurfaceSecondary }]}>
          RECENT
        </Text>

        <ConversationList
          conversations={sorted}
          onSelect={handleSelect}
          onDelete={deleteConversation}
          onRename={handleRename}
          onTogglePin={togglePin}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 140,
  },
  headerAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBlock: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 4,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 14,
  },
  topicIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicTitle: {
    fontWeight: '600',
  },
  blankChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    marginTop: 12,
  },
  blankChatText: {
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
