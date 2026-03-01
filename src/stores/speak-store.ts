import { create } from 'zustand';
import type { Scenario, ConversationMessage } from '@/types/scenario';
import { BUILTIN_SCENARIOS } from '@/lib/scenarios';

interface SpeakState {
  scenarios: Scenario[];
  selectedCategory: string | null;

  activeScenarioId: string | null;
  messages: ConversationMessage[];
  isStreaming: boolean;
  isRecording: boolean;

  setSelectedCategory: (category: string | null) => void;
  setActiveScenario: (id: string | null) => void;
  addMessage: (message: ConversationMessage) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  resetConversation: () => void;
  addCustomScenario: (scenario: Scenario) => void;
  toggleMessageTranslation: (messageId: string) => void;
  setMessageTranslation: (messageId: string, translation: string | null, error?: string | null) => void;
  setMessageTranslating: (messageId: string, isTranslating: boolean) => void;
  setMessagePlaying: (messageId: string, isPlaying: boolean) => void;
  clearAllPlaying: () => void;
}

export const useSpeakStore = create<SpeakState>((set) => ({
  scenarios: [...BUILTIN_SCENARIOS],
  selectedCategory: null,
  activeScenarioId: null,
  messages: [],
  isStreaming: false,
  isRecording: false,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setActiveScenario: (id) => set({ activeScenarioId: id, messages: [] }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = { ...messages[messages.length - 1], content };
    }
    return { messages };
  }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  resetConversation: () => set({ messages: [], isStreaming: false, isRecording: false }),
  addCustomScenario: (scenario) => set((state) => ({ scenarios: [...state.scenarios, scenario] })),
  toggleMessageTranslation: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, translationEnabled: !m.translationEnabled } : m
    ),
  })),
  setMessageTranslation: (messageId, translation, error) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, translation, translationError: error || null, isTranslating: false } : m
    ),
  })),
  setMessageTranslating: (messageId, isTranslating) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, isTranslating } : m
    ),
  })),
  setMessagePlaying: (messageId, isPlaying) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, isPlaying } : { ...m, isPlaying: false }
    ),
  })),
  clearAllPlaying: () => set((state) => ({
    messages: state.messages.map((m) => m.isPlaying ? { ...m, isPlaying: false } : m),
  })),
}));
