'use client';

import { BarChart3, BookOpen, Bot, Headphones, Languages, MessageSquare, PenLine, Plus, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OllamaStatusIndicator } from '@/components/ollama/ollama-status-indicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOllamaPreload } from '@/hooks/use-ollama-preload';
import { collectLearningSnapshot } from '@/lib/chat-analytics';
import { getPromptForExercise, getUserMessageForExercise } from '@/lib/chat-prompts';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useChatStore } from '@/stores/chat-store';
import { useContentStore } from '@/stores/content-store';
import { useProviderStore } from '@/stores/provider-store';
import type { ChatContext, ChatMessage, ExerciseType } from '@/types/chat';
import type { ContentItem } from '@/types/content';
import { ChatContentPicker } from './chat-content-picker';
import { ChatMessageComponent } from './chat-message';
import { ChatModeSelector } from './chat-mode-selector';
import { ChatSearchPanel } from './chat-search-panel';
import { ChatToolbar } from './chat-toolbar';
import { ChatVoiceInput } from './chat-voice-input';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeExercise, setActiveExercise] = useState<ExerciseType | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Chat store
  const messages = useChatStore((s) => s.messages);
  const inputValue = useChatStore((s) => s.inputValue);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const providerNotice = useChatStore((s) => s.providerNotice);
  const chatMode = useChatStore((s) => s.chatMode);
  const activeContentItem = useChatStore((s) => s.activeContentItem);
  const activeContentId = useChatStore((s) => s.activeContentId);
  const panelSize = useChatStore((s) => s.panelSize);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastAssistantMessage = useChatStore((s) => s.updateLastAssistantMessage);
  const saveCurrentMessages = useChatStore((s) => s.saveCurrentMessages);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const setProviderNotice = useChatStore((s) => s.setProviderNotice);
  const setActiveContent = useChatStore((s) => s.setActiveContent);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const newConversation = useChatStore((s) => s.newConversation);

  // Provider store
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const activeConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];
  const ollamaModelStatus = useProviderStore((s) => s.ollamaModelStatus);
  const ollamaFirstUse = useProviderStore((s) => s.ollamaFirstUse);
  const setOllamaStatus = useProviderStore((s) => s.setOllamaStatus);

  useOllamaPreload(true);

  const currentLevel = useAssessmentStore((s) => s.currentLevel);

  // Content store
  const contentItems = useContentStore((s) => s.items);
  const loadContents = useContentStore((s) => s.loadContents);

  // Hydrate on mount
  useEffect(() => {
    useChatStore.getState().hydrate();
    if (contentItems.length === 0) loadContents();
  }, [contentItems.length, loadContents]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Send message ─────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, context?: Partial<ChatContext>) => {
      if (!content.trim() || isStreaming) return;

      if (activeProviderId === 'ollama') {
        setOllamaStatus('generating');
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      addMessage(userMsg);
      setInputValue('');
      setIsStreaming(true);
      setProviderNotice('');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeConfig.auth.apiKey) {
        headers[providerDef.headerKey] = activeConfig.auth.apiKey;
      } else if (activeConfig.auth.accessToken) {
        headers[providerDef.headerKey] = activeConfig.auth.accessToken;
      }

      // Build context
      const chatContext: ChatContext = {
        module: 'general',
        contentTitle: '',
        chatMode,
        ...context,
      };

      if (activeContentItem) {
        chatContext.contentText = activeContentItem.text;
        chatContext.contentType = activeContentItem.type;
        chatContext.contentTitle = activeContentItem.title;
      }

      // Build message list for API
      const apiMessages = messages
        .filter((m) => m.role !== 'system')
        .concat(userMsg)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: apiMessages,
            provider: activeProviderId,
            providerConfigs: providers,
            context: chatContext,
            userLevel: currentLevel,
          }),
        });

        if (!res.ok || !res.body) throw new Error('Failed to fetch');

        const effectiveProviderId = res.headers.get('x-provider-id');
        const fallbackApplied = res.headers.get('x-provider-fallback') === 'true';
        if (fallbackApplied && effectiveProviderId) {
          setProviderNotice(`Using ${effectiveProviderId} fallback for chat`);
        } else if (effectiveProviderId) {
          setProviderNotice(`Using ${effectiveProviderId}`);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };
        addMessage(assistantMsg);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          updateLastAssistantMessage(fullContent);
        }
      } catch {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: Date.now(),
        });
      } finally {
        setIsStreaming(false);
        saveCurrentMessages();
        if (activeProviderId === 'ollama') {
          setOllamaStatus('ready');
        }
      }
    },
    [
      isStreaming,
      messages,
      activeProviderId,
      activeConfig,
      providerDef,
      setOllamaStatus,
      currentLevel,
      providers,
      chatMode,
      activeContentItem,
      addMessage,
      updateLastAssistantMessage,
      saveCurrentMessages,
      setInputValue,
      setIsStreaming,
      setProviderNotice,
    ],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage],
  );

  // ─── Content selection ────────────────────────────────────────────────

  const handleContentSelect = useCallback(
    (item: ContentItem) => {
      setActiveContent(item.id, item);
      setShowLibrary(false);
      setActiveExercise(null);

      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: `Content loaded: "${item.title}" (${item.type})`,
        timestamp: Date.now(),
      });
    },
    [setActiveContent, addMessage],
  );

  const handleContentFromSearch = useCallback(
    (contentId: string) => {
      const item = contentItems.find((i) => i.id === contentId);
      if (item) {
        handleContentSelect(item);
        setShowSearch(false);
      }
    },
    [contentItems, handleContentSelect],
  );

  // ─── Exercise selection ───────────────────────────────────────────────

  const handleExerciseSelect = useCallback(
    (type: ExerciseType) => {
      setActiveExercise(type);
      if (activeContentItem) {
        const exercisePrompt = getPromptForExercise(
          type,
          activeContentItem.text,
          activeContentItem.difficulty || 'intermediate',
        );
        const userMessage = getUserMessageForExercise(type);
        sendMessage(userMessage, { exerciseType: type, chatMode: 'practice', exercisePrompt });
      }
    },
    [activeContentItem, sendMessage],
  );

  // ─── Analytics ────────────────────────────────────────────────────────

  const handleAnalytics = useCallback(async () => {
    setChatMode('analytics');
    const snapshot = await collectLearningSnapshot();
    sendMessage('Analyze my learning progress and give me specific suggestions.', {
      chatMode: 'analytics',
      analyticsData: snapshot as unknown as Record<string, unknown>,
    });
  }, [setChatMode, sendMessage]);

  // ─── Voice input ──────────────────────────────────────────────────────

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInputValue(text);
      setIsListening(false);
    },
    [setInputValue],
  );

  // ─── Navigation ─────────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (path: string) => {
      // Close panels first, then navigate (navigation causes page change which unmounts panel)
      setShowLibrary(false);
      setShowSearch(false);
      router.push(path);
    },
    [router],
  );

  // ─── Panel sizing ────────────────────────────────────────────────────

  const panelWidth = panelSize === 'expanded' ? 'w-[600px]' : 'w-[400px]';
  const panelHeight = panelSize === 'expanded' ? 'h-[700px]' : 'h-[500px]';

  // ─── Quick action presets ─────────────────────────────────────────────
  const quickActions = [
    {
      icon: MessageSquare,
      label: 'Daily Chat',
      prompt: "Let's have a daily English conversation. Start a topic and I'll practice with you.",
    },
    {
      icon: PenLine,
      label: 'Grammar Check',
      prompt: "I'd like to practice grammar. Give me a sentence to correct or ask me to write one for you to check.",
    },
    {
      icon: BookOpen,
      label: 'Vocab Quiz',
      prompt: 'Give me a vocabulary quiz with 5 words at my level. Include definitions, examples, and a mini quiz.',
    },
    {
      icon: Languages,
      label: 'Translate',
      prompt: 'Give me 3 English sentences to translate into Chinese, then check my answers.',
    },
    {
      icon: Headphones,
      label: 'Listening',
      prompt:
        'Create a short listening exercise. Give me a paragraph to listen to and then ask comprehension questions.',
    },
    {
      icon: BarChart3,
      label: 'My Progress',
      action: 'analytics' as const,
    },
  ];

  const handleQuickAction = useCallback(
    (action: (typeof quickActions)[number]) => {
      if ('action' in action && action.action === 'analytics') {
        handleAnalytics();
      } else if ('prompt' in action) {
        sendMessage(action.prompt);
      }
    },
    [handleAnalytics, sendMessage],
  );

  return (
    <Card
      className={`fixed bottom-24 right-6 ${panelWidth} ${panelHeight} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-white/90 backdrop-blur-xl border-indigo-100 shadow-xl rounded-2xl flex flex-col z-40 overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="font-semibold text-indigo-900 text-sm truncate">AI English Tutor</span>
          <span className="text-[10px] text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
            {providerDef.name}
          </span>
          {chatMode !== 'general' && (
            <span className="text-[10px] text-white bg-indigo-500 px-1.5 py-0.5 rounded-full shrink-0 capitalize">
              {chatMode}
            </span>
          )}
        </div>

        {activeProviderId === 'ollama' && (
          <OllamaStatusIndicator status={ollamaModelStatus} isFirstUse={ollamaFirstUse} />
        )}

        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button
            type="button"
            onClick={newConversation}
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors p-1"
            aria-label="New conversation"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors p-1"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active content bar */}
      {activeContentItem && (
        <div className="px-4 py-1.5 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
          <span className="text-[10px] text-indigo-500 shrink-0">Practicing:</span>
          <span className="text-xs text-indigo-700 font-medium truncate">{activeContentItem.title}</span>
          <button
            type="button"
            onClick={() => {
              setActiveContent(null, null);
              setChatMode('general');
              setActiveExercise(null);
            }}
            className="text-indigo-400 hover:text-indigo-600 cursor-pointer transition-colors ml-auto shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {providerNotice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {providerNotice}
            </div>
          )}
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="w-8 h-8 mx-auto mb-2 text-indigo-300" />
              <p className="text-indigo-500 text-sm font-medium">Hi! I&apos;m your English tutor.</p>
              <p className="text-indigo-400 text-xs mt-1 mb-4">What would you like to practice?</p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    disabled={isStreaming}
                    className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/60 px-3 py-2.5 text-xs text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <action.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageComponent key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      {/* Exercise mode selector (when content loaded) */}
      {activeContentItem && chatMode === 'practice' && (
        <ChatModeSelector activeType={activeExercise} onSelect={handleExerciseSelect} onNavigate={handleNavigate} />
      )}

      {/* Panels (Library / Search) */}
      {showLibrary && (
        <ChatContentPicker
          onSelect={handleContentSelect}
          onClose={() => setShowLibrary(false)}
          activeContentId={activeContentId}
        />
      )}
      {showSearch && <ChatSearchPanel onClose={() => setShowSearch(false)} onSelectContent={handleContentFromSearch} />}

      {/* Toolbar */}
      <ChatToolbar
        onLibraryToggle={() => {
          setShowLibrary(!showLibrary);
          setShowSearch(false);
        }}
        onSearchToggle={() => {
          setShowSearch(!showSearch);
          setShowLibrary(false);
        }}
        onMicToggle={() => setIsListening(!isListening)}
        onAnalytics={handleAnalytics}
        onNavigate={handleNavigate}
        showLibrary={showLibrary}
        showSearch={showSearch}
        isListening={isListening}
      />

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-indigo-100 flex gap-2 shrink-0">
        {isListening && <ChatVoiceInput onTranscript={handleVoiceTranscript} />}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={activeContentItem ? 'Ask about this content...' : 'Ask me anything...'}
          className="flex-1 bg-white/50 border-indigo-200 text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || isStreaming}
          className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
