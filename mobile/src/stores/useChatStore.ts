import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;

  // Actions
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, role: 'user' | 'assistant' | 'tool', content: string) => string;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  getCurrentConversation: () => Conversation | undefined;
  setIsLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,

      createConversation: (title) => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversation: Conversation = {
          id,
          title: title || 'New Chat',
          messages: [
            {
              id: `msg_system_${Date.now()}`,
              role: 'system',
              content:
                'You are a friendly English tutor. Help the user practice English through conversation. Correct their grammar gently, explain vocabulary, and encourage them to express themselves.',
              createdAt: Date.now(),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        }));
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId, role, content) => {
        const message: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role,
          content,
          createdAt: Date.now(),
        };

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: Date.now(),
                  title: c.messages.length === 1 && role === 'user' ? content.slice(0, 40) : c.title,
                }
              : c,
          ),
        }));

        return message.id;
      },

      updateLastAssistantMessage: (conversationId, content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            const messages = [...conv.messages];
            const lastIdx = messages.length - 1;
            if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
              messages[lastIdx] = { ...messages[lastIdx], content };
            }
            return { ...conv, messages, updatedAt: Date.now() };
          }),
        }));
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            const messages = conv.messages.map((m) => (m.id === messageId ? { ...m, content } : m));
            return { ...conv, messages, updatedAt: Date.now() };
          }),
        }));
      },

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return conversations.find((c) => c.id === currentConversationId);
      },

      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
