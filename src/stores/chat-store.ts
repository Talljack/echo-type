import { create } from 'zustand';
import { getConversationTitle } from '@/lib/chat-ui';
import { db } from '@/lib/db';
import type { ChatMode, ChatUIMessage, Conversation, PanelSize } from '@/types/chat';
import type { ContentItem } from '@/types/content';

const AUTOSAVE_DEBOUNCE_MS = 250;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function createConversationState() {
  return {
    conversationId: crypto.randomUUID(),
    conversationCreatedAt: Date.now(),
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface ChatStore {
  // State
  messages: ChatUIMessage[];
  conversationList: Conversation[];
  chatMode: ChatMode;
  activeContentId: string | null;
  activeContentItem: ContentItem | null;
  isStreaming: boolean;
  inputValue: string;
  providerNotice: string;
  panelSize: PanelSize;
  conversationId: string;
  conversationCreatedAt: number;
  isOpen: boolean;

  // Actions
  setMessages: (messages: ChatUIMessage[]) => void;
  saveConversation: (messages?: ChatUIMessage[]) => Promise<void>;
  loadConversationList: () => Promise<void>;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
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

function scheduleConversationSave() {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void useChatStore.getState().saveConversation();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function buildConversationRecord(state: ChatStore, messages: ChatUIMessage[]): Conversation | null {
  const trimmedMessages = messages.filter((message) => message.parts.length > 0);
  const hasConversationState =
    trimmedMessages.length > 0 || state.chatMode !== 'general' || state.activeContentId !== null;

  if (!hasConversationState) {
    return null;
  }

  const now = Date.now();

  return {
    id: state.conversationId,
    title: getConversationTitle(trimmedMessages),
    messages: trimmedMessages,
    chatMode: state.chatMode,
    activeContentId: state.activeContentId,
    createdAt: state.conversationCreatedAt,
    updatedAt: now,
  };
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversationList: [],
  chatMode: 'general',
  activeContentId: null,
  activeContentItem: null,
  isStreaming: false,
  inputValue: '',
  providerNotice: '',
  panelSize: 'compact',
  ...createConversationState(),
  isOpen: false,

  setMessages: (messages) => {
    set({ messages });
    scheduleConversationSave();
  },

  saveConversation: async (messagesOverride) => {
    const state = get();
    const record = buildConversationRecord(state, messagesOverride ?? state.messages);

    if (!record) {
      return;
    }

    await db.conversations.put(record);
    await get().loadConversationList();
  },

  loadConversationList: async () => {
    const conversationList = await db.conversations.orderBy('updatedAt').reverse().limit(50).toArray();
    set({ conversationList });
  },

  switchConversation: async (id) => {
    if (id === get().conversationId) return;

    await get().saveConversation();

    const conversation = await db.conversations.get(id);
    if (!conversation) return;

    set({
      messages: conversation.messages,
      conversationId: conversation.id,
      conversationCreatedAt: conversation.createdAt,
      chatMode: conversation.chatMode,
      activeContentId: conversation.activeContentId,
      activeContentItem: null,
      providerNotice: '',
    });
  },

  deleteConversation: async (id) => {
    await db.conversations.delete(id);
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    const conversationList = await db.conversations.orderBy('updatedAt').reverse().limit(50).toArray();

    if (get().conversationId !== id) {
      set({ conversationList });
      return;
    }

    const nextConversation = conversationList[0];
    if (nextConversation) {
      set({
        conversationList,
        messages: nextConversation.messages,
        conversationId: nextConversation.id,
        conversationCreatedAt: nextConversation.createdAt,
        chatMode: nextConversation.chatMode,
        activeContentId: nextConversation.activeContentId,
        activeContentItem: null,
        providerNotice: '',
      });
      return;
    }

    const nextState = createConversationState();
    set({
      conversationList: [],
      messages: [],
      chatMode: 'general',
      activeContentId: null,
      activeContentItem: null,
      providerNotice: '',
      ...nextState,
    });
  },

  setActiveContent: (id, item) => {
    set({ activeContentId: id, activeContentItem: item });
    if (item) {
      set({ chatMode: item.type === 'article' ? 'reading' : 'practice' });
    }
    scheduleConversationSave();
  },

  setChatMode: (chatMode) => {
    set({ chatMode });
    scheduleConversationSave();
  },

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setInputValue: (inputValue) => set({ inputValue }),

  setProviderNotice: (providerNotice) => set({ providerNotice }),

  setPanelSize: (panelSize) => set({ panelSize }),

  setIsOpen: (isOpen) => set({ isOpen }),

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  newConversation: async () => {
    await get().saveConversation();
    const nextState = createConversationState();
    set({
      conversationList: get().conversationList,
      messages: [],
      chatMode: 'general',
      activeContentId: null,
      activeContentItem: null,
      providerNotice: '',
      inputValue: '',
      ...nextState,
    });
  },

  hydrate: async () => {
    const conversationList = await db.conversations.orderBy('updatedAt').reverse().limit(50).toArray();

    if (conversationList.length > 0) {
      const latest = conversationList[0];
      set({
        conversationList,
        messages: latest.messages,
        conversationId: latest.id,
        conversationCreatedAt: latest.createdAt,
        chatMode: latest.chatMode,
        activeContentId: latest.activeContentId,
        activeContentItem: null,
      });
    } else {
      const nextState = createConversationState();
      set({
        conversationList: [],
        messages: [],
        chatMode: 'general',
        activeContentId: null,
        activeContentItem: null,
        ...nextState,
      });
    }

    set({ isStreaming: false, providerNotice: '' });
  },
}));
