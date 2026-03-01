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
}));
