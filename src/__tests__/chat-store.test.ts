import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Browser environment mock ───────────────────────────────────────────────

const store = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (index: number) => [...store.keys()][index] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', globalThis);

// Stub crypto.randomUUID for deterministic IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

const { useChatStore } = await import('@/stores/chat-store');
type ChatMessage = import('@/types/chat').ChatMessage;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMessage(role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}

function makeContentItem() {
  return {
    id: 'content-1',
    title: 'Test Content',
    text: 'Hello world',
    type: 'sentence' as const,
    category: 'test',
    tags: ['test'],
    source: 'imported' as const,
    difficulty: 'intermediate' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('chat-store', () => {
  beforeEach(() => {
    store.clear();
    uuidCounter = 0;
    useChatStore.setState({
      messages: [],
      chatMode: 'general',
      activeContentId: null,
      activeContentItem: null,
      isStreaming: false,
      inputValue: '',
      providerNotice: '',
      panelSize: 'compact',
      conversationId: 'test-conv-id',
      isOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Default state ─────────────────────────────────────────────────────────

  describe('default state', () => {
    it('has correct defaults', () => {
      const s = useChatStore.getState();
      expect(s.messages).toEqual([]);
      expect(s.chatMode).toBe('general');
      expect(s.activeContentId).toBeNull();
      expect(s.activeContentItem).toBeNull();
      expect(s.isStreaming).toBe(false);
      expect(s.inputValue).toBe('');
      expect(s.providerNotice).toBe('');
      expect(s.panelSize).toBe('compact');
      expect(s.isOpen).toBe(false);
    });
  });

  // ── addMessage ────────────────────────────────────────────────────────────

  describe('addMessage', () => {
    it('appends a message to the list', () => {
      const msg = makeMessage('user', 'Hello');
      useChatStore.getState().addMessage(msg);
      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].content).toBe('Hello');
    });

    it('preserves previous messages', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'First'));
      useChatStore.getState().addMessage(makeMessage('assistant', 'Second'));
      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[0].content).toBe('First');
      expect(useChatStore.getState().messages[1].content).toBe('Second');
    });

    it('persists to localStorage', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hello'));
      const raw = store.get('echotype_chat_messages');
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].content).toBe('Hello');
    });

    it('limits persisted messages to 100', () => {
      for (let i = 0; i < 110; i++) {
        useChatStore.getState().addMessage(makeMessage('user', `Message ${i}`));
      }
      const raw = store.get('echotype_chat_messages');
      const parsed = JSON.parse(raw!);
      expect(parsed.length).toBeLessThanOrEqual(100);
      // Most recent messages should be kept
      expect(parsed[parsed.length - 1].content).toBe('Message 109');
    });
  });

  // ── updateLastAssistantMessage ────────────────────────────────────────────

  describe('updateLastAssistantMessage', () => {
    it('updates the last assistant message content', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.getState().addMessage(makeMessage('assistant', ''));
      useChatStore.getState().updateLastAssistantMessage('Hello there!');
      const last = useChatStore.getState().messages[1];
      expect(last.content).toBe('Hello there!');
    });

    it('does not modify user messages', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.getState().updateLastAssistantMessage('Changed');
      // Last message is user, should not change
      expect(useChatStore.getState().messages[0].content).toBe('Hi');
    });
  });

  // ── clearMessages ─────────────────────────────────────────────────────────

  describe('clearMessages', () => {
    it('empties messages array', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.getState().clearMessages();
      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('persists empty array to localStorage', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.getState().clearMessages();
      const raw = store.get('echotype_chat_messages');
      expect(JSON.parse(raw!)).toEqual([]);
    });
  });

  // ── setActiveContent ──────────────────────────────────────────────────────

  describe('setActiveContent', () => {
    it('sets content id and item', () => {
      const item = makeContentItem();
      useChatStore.getState().setActiveContent(item.id, item);
      expect(useChatStore.getState().activeContentId).toBe('content-1');
      expect(useChatStore.getState().activeContentItem).toEqual(item);
    });

    it('switches to practice mode for non-article content', () => {
      const item = makeContentItem();
      useChatStore.getState().setActiveContent(item.id, item);
      expect(useChatStore.getState().chatMode).toBe('practice');
    });

    it('switches to reading mode for article content', () => {
      const item = { ...makeContentItem(), type: 'article' as const };
      useChatStore.getState().setActiveContent(item.id, item);
      expect(useChatStore.getState().chatMode).toBe('reading');
    });

    it('clears content when null', () => {
      useChatStore.getState().setActiveContent('x', makeContentItem());
      useChatStore.getState().setActiveContent(null, null);
      expect(useChatStore.getState().activeContentId).toBeNull();
      expect(useChatStore.getState().activeContentItem).toBeNull();
    });
  });

  // ── toggleOpen ────────────────────────────────────────────────────────────

  describe('toggleOpen', () => {
    it('flips isOpen from false to true', () => {
      useChatStore.getState().toggleOpen();
      expect(useChatStore.getState().isOpen).toBe(true);
    });

    it('flips isOpen from true to false', () => {
      useChatStore.setState({ isOpen: true });
      useChatStore.getState().toggleOpen();
      expect(useChatStore.getState().isOpen).toBe(false);
    });
  });

  // ── newConversation ───────────────────────────────────────────────────────

  describe('newConversation', () => {
    it('resets messages and mode', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.setState({ chatMode: 'practice', activeContentId: 'x' });
      useChatStore.getState().newConversation();
      const s = useChatStore.getState();
      expect(s.messages).toEqual([]);
      expect(s.chatMode).toBe('general');
      expect(s.activeContentId).toBeNull();
      expect(s.activeContentItem).toBeNull();
      expect(s.providerNotice).toBe('');
    });

    it('generates a new conversationId', () => {
      const oldId = useChatStore.getState().conversationId;
      useChatStore.getState().newConversation();
      expect(useChatStore.getState().conversationId).not.toBe(oldId);
    });

    it('clears localStorage', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Hi'));
      useChatStore.getState().newConversation();
      const raw = store.get('echotype_chat_messages');
      expect(JSON.parse(raw!)).toEqual([]);
    });
  });

  // ── hydrate ───────────────────────────────────────────────────────────────

  describe('hydrate', () => {
    it('restores messages from localStorage', () => {
      const saved: ChatMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: 1000 },
        { id: 'msg-2', role: 'assistant', content: 'Hi there', timestamp: 1001 },
      ];
      store.set('echotype_chat_messages', JSON.stringify(saved));
      useChatStore.getState().hydrate();
      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[0].content).toBe('Hello');
    });

    it('does nothing when localStorage is empty', () => {
      useChatStore.getState().hydrate();
      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('handles corrupted localStorage gracefully', () => {
      store.set('echotype_chat_messages', 'not-json');
      useChatStore.getState().hydrate();
      expect(useChatStore.getState().messages).toEqual([]);
    });
  });

  // ── setChatMode ───────────────────────────────────────────────────────────

  describe('setChatMode', () => {
    it('sets the chat mode', () => {
      useChatStore.getState().setChatMode('analytics');
      expect(useChatStore.getState().chatMode).toBe('analytics');
    });
  });

  // ── setPanelSize ──────────────────────────────────────────────────────────

  describe('setPanelSize', () => {
    it('toggles panel size', () => {
      useChatStore.getState().setPanelSize('expanded');
      expect(useChatStore.getState().panelSize).toBe('expanded');
      useChatStore.getState().setPanelSize('compact');
      expect(useChatStore.getState().panelSize).toBe('compact');
    });
  });

  // ── Combined flows ────────────────────────────────────────────────────────

  describe('combined flows', () => {
    it('round-trip: add messages → hydrate', () => {
      useChatStore.getState().addMessage(makeMessage('user', 'Test'));
      useChatStore.getState().addMessage(makeMessage('assistant', 'Reply'));

      // Simulate page reload
      useChatStore.setState({ messages: [] });
      useChatStore.getState().hydrate();

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[0].content).toBe('Test');
      expect(useChatStore.getState().messages[1].content).toBe('Reply');
    });

    it('set content → select exercise type flow', () => {
      const item = makeContentItem();
      useChatStore.getState().setActiveContent(item.id, item);
      expect(useChatStore.getState().chatMode).toBe('practice');

      // Clearing content resets (caller would set mode)
      useChatStore.getState().setActiveContent(null, null);
      useChatStore.getState().setChatMode('general');
      expect(useChatStore.getState().chatMode).toBe('general');
    });
  });
});
