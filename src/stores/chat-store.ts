import { create } from 'zustand';
import type { ChatMessage, ChatMode, PanelSize } from '@/types/chat';
import type { ContentItem } from '@/types/content';

// ─── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'echotype_chat_messages';
const MAX_PERSISTED_MESSAGES = 100;

function loadMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = messages.slice(-MAX_PERSISTED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore */
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface ChatStore {
  // State
  messages: ChatMessage[];
  chatMode: ChatMode;
  activeContentId: string | null;
  activeContentItem: ContentItem | null;
  isStreaming: boolean;
  inputValue: string;
  providerNotice: string;
  panelSize: PanelSize;
  conversationId: string;
  isOpen: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  saveCurrentMessages: () => void;
  clearMessages: () => void;
  setActiveContent: (id: string | null, item: ContentItem | null) => void;
  setChatMode: (mode: ChatMode) => void;
  setIsStreaming: (streaming: boolean) => void;
  setInputValue: (value: string) => void;
  setProviderNotice: (notice: string) => void;
  setPanelSize: (size: PanelSize) => void;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  newConversation: () => void;
  hydrate: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  chatMode: 'general',
  activeContentId: null,
  activeContentItem: null,
  isStreaming: false,
  inputValue: '',
  providerNotice: '',
  panelSize: 'compact',
  conversationId: crypto.randomUUID(),
  isOpen: false,

  addMessage: (message) => {
    const messages = [...get().messages, message];
    set({ messages });
    saveMessages(messages);
  },

  updateLastAssistantMessage: (content) => {
    const messages = [...get().messages];
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant') {
      messages[messages.length - 1] = { ...last, content };
    }
    set({ messages });
    // NOTE: Do NOT call saveMessages() here — this runs on every streaming
    // chunk and synchronous localStorage writes would block the main thread.
    // Instead, call saveCurrentMessages() once after streaming completes.
  },

  saveCurrentMessages: () => {
    saveMessages(get().messages);
  },

  clearMessages: () => {
    set({ messages: [] });
    saveMessages([]);
  },

  setActiveContent: (id, item) => {
    set({ activeContentId: id, activeContentItem: item });
    if (item) {
      set({ chatMode: item.type === 'article' ? 'reading' : 'practice' });
    }
  },

  setChatMode: (chatMode) => set({ chatMode }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setInputValue: (inputValue) => set({ inputValue }),

  setProviderNotice: (providerNotice) => set({ providerNotice }),

  setPanelSize: (panelSize) => set({ panelSize }),

  setIsOpen: (isOpen) => set({ isOpen }),

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  newConversation: () => {
    set({
      messages: [],
      chatMode: 'general',
      activeContentId: null,
      activeContentItem: null,
      conversationId: crypto.randomUUID(),
      providerNotice: '',
    });
    saveMessages([]);
  },

  hydrate: () => {
    const messages = loadMessages();
    if (messages.length > 0) {
      set({ messages });
    }
  },
}));
