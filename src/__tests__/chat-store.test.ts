import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatUIMessage, Conversation } from '@/types/chat';

const conversations = new Map<string, Conversation>();

vi.mock('@/lib/db', () => ({
  db: {
    conversations: {
      put: vi.fn(async (conversation: Conversation) => {
        conversations.set(conversation.id, conversation);
      }),
      get: vi.fn(async (id: string) => conversations.get(id)),
      delete: vi.fn(async (id: string) => {
        conversations.delete(id);
      }),
      orderBy: vi.fn(() => ({
        reverse: () => ({
          limit: (limit: number) => ({
            toArray: async () =>
              Array.from(conversations.values())
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, limit),
          }),
        }),
      })),
    },
  },
}));

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});
vi.stubGlobal('window', globalThis);

const { useChatStore } = await import('@/stores/chat-store');

function makeUIMessage(role: 'user' | 'assistant', text: string): ChatUIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: 'text', text }],
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Saved conversation',
    messages: overrides.messages ?? [makeUIMessage('user', 'Hello there')],
    chatMode: overrides.chatMode ?? 'general',
    activeContentId: overrides.activeContentId ?? null,
    createdAt: overrides.createdAt ?? Date.now() - 1000,
    updatedAt: overrides.updatedAt ?? Date.now(),
  };
}

describe('chat-store conversation history', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    conversations.clear();
    uuidCounter = 0;
    useChatStore.setState({
      messages: [],
      conversationList: [],
      chatMode: 'general',
      activeContentId: null,
      activeContentItem: null,
      isStreaming: false,
      inputValue: '',
      providerNotice: '',
      panelSize: 'compact',
      conversationId: 'test-conversation',
      conversationCreatedAt: 1000,
      isOpen: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('saveConversation persists messages to Dexie with auto-generated title', async () => {
    useChatStore.setState({
      conversationId: 'conversation-1',
      conversationCreatedAt: 5000,
      messages: [makeUIMessage('user', 'This is a stored conversation title candidate')],
    });

    await useChatStore.getState().saveConversation();

    const saved = conversations.get('conversation-1');
    expect(saved?.title).toBe('This is a stored conversation title candidate');
    expect(saved?.messages).toHaveLength(1);
  });

  it('loadConversationList returns recent conversations sorted by updatedAt desc', async () => {
    conversations.set('older', makeConversation({ id: 'older', updatedAt: 1000 }));
    conversations.set('newer', makeConversation({ id: 'newer', updatedAt: 5000 }));

    await useChatStore.getState().loadConversationList();

    expect(useChatStore.getState().conversationList.map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('switchConversation loads the selected conversation', async () => {
    const target = makeConversation({
      id: 'conversation-2',
      messages: [makeUIMessage('user', 'Load me')],
      chatMode: 'practice',
      activeContentId: 'content-1',
    });
    conversations.set(target.id, target);

    await useChatStore.getState().switchConversation(target.id);

    const state = useChatStore.getState();
    expect(state.conversationId).toBe(target.id);
    expect(state.chatMode).toBe('practice');
    expect(state.activeContentId).toBe('content-1');
    expect(state.messages).toEqual(target.messages);
  });

  it('newConversation saves the current conversation before clearing state', async () => {
    useChatStore.setState({
      conversationId: 'conversation-3',
      conversationCreatedAt: 2000,
      messages: [makeUIMessage('user', 'Persist before reset')],
      chatMode: 'practice',
      activeContentId: 'content-1',
    });

    await useChatStore.getState().newConversation();

    expect(conversations.get('conversation-3')?.title).toBe('Persist before reset');
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().chatMode).toBe('general');
    expect(useChatStore.getState().conversationId).not.toBe('conversation-3');
  });

  it('deleteConversation removes it and falls back to the next saved conversation', async () => {
    const current = makeConversation({ id: 'current', updatedAt: 4000 });
    const fallback = makeConversation({ id: 'fallback', updatedAt: 3000 });
    conversations.set(current.id, current);
    conversations.set(fallback.id, fallback);
    useChatStore.setState({
      conversationId: current.id,
      conversationCreatedAt: current.createdAt,
      messages: current.messages,
      conversationList: [current, fallback],
    });

    await useChatStore.getState().deleteConversation(current.id);

    expect(conversations.has(current.id)).toBe(false);
    expect(useChatStore.getState().conversationId).toBe('fallback');
  });

  it('hydrate loads the latest conversation from Dexie', async () => {
    const latest = makeConversation({ id: 'latest', updatedAt: 9000 });
    const older = makeConversation({ id: 'older', updatedAt: 1000 });
    conversations.set(older.id, older);
    conversations.set(latest.id, latest);

    await useChatStore.getState().hydrate();

    const state = useChatStore.getState();
    expect(state.conversationId).toBe('latest');
    expect(state.messages).toEqual(latest.messages);
    expect(state.isStreaming).toBe(false);
  });

  it('setMessages autosaves the current conversation with debounce', async () => {
    useChatStore.setState({
      conversationId: 'autosave-conversation',
      conversationCreatedAt: 1234,
    });

    useChatStore.getState().setMessages([makeUIMessage('user', 'Autosave me')]);
    await vi.advanceTimersByTimeAsync(300);

    expect(conversations.get('autosave-conversation')?.title).toBe('Autosave me');
  });
});
