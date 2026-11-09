'use client';

import { useChat } from '@ai-sdk/react';
import { type ChatRequestOptions, DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Headphones,
  Languages,
  MessageSquare,
  PenLine,
  Send,
  Settings,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatHistory } from '@/components/chat/chat-history';
import { OllamaStatusIndicator } from '@/components/ollama/ollama-status-indicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useOllamaPreload } from '@/hooks/use-ollama-preload';
import { useTTS } from '@/hooks/use-tts';
import { navigateApp } from '@/lib/app-navigation';
import { getChatDockClasses } from '@/lib/chat-dock-layout';
import { executeTool } from '@/lib/chat-tool-executor';
import { toRenderableChatMessage } from '@/lib/chat-ui';
import enChat from '@/lib/i18n/messages/chat/en.json';
import zhChat from '@/lib/i18n/messages/chat/zh.json';
import { parseProviderTokenBudget } from '@/lib/provider-token-budget';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';
import { type CEFRLevel, useAssessmentStore } from '@/stores/assessment-store';
import { useChatStore } from '@/stores/chat-store';
import { useContentStore } from '@/stores/content-store';
import { useLanguageStore } from '@/stores/language-store';
import { useProviderStore } from '@/stores/provider-store';
import { useTTSStore } from '@/stores/tts-store';

const CHAT_LOCALES = { en: enChat, zh: zhChat } as const;
type ChatLocale = (typeof CHAT_LOCALES)[keyof typeof CHAT_LOCALES];

import { ChatContentPicker } from './chat-content-picker';
import { ChatMessageComponent } from './chat-message';
import { ChatSearchPanel } from './chat-search-panel';
import { ChatToolbar } from './chat-toolbar';
import { ChatVoiceInput } from './chat-voice-input';

interface ChatPanelProps {
  onClose: () => void;
}

function cefrToDifficulty(level: CEFRLevel | null): 'beginner' | 'intermediate' | 'advanced' {
  if (!level) return 'intermediate';
  if (level === 'A1' || level === 'A2') return 'beginner';
  if (level === 'B1' || level === 'B2') return 'intermediate';
  return 'advanced';
}

interface ParsedError {
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: string };
}

function parseProviderError(message: string, locale: ChatLocale): ParsedError | null {
  const lower = message.toLowerCase();
  const e = locale.errors;

  if (lower.includes('max_tokens') || lower.includes('credits') || lower.includes('can only afford')) {
    const tokenBudget = parseProviderTokenBudget(message);
    return {
      title: e.tokenLimit.title,
      description: tokenBudget?.requested
        ? e.tokenLimit.descriptionDetailed
            .replace('{{requested}}', String(tokenBudget.requested))
            .replace('{{available}}', String(tokenBudget.available))
        : e.tokenLimit.descriptionGeneral,
      action: { label: e.openSettings, href: '/settings' },
    };
  }

  if (lower.includes('rate limit') || lower.includes('rate_limit') || lower.includes('too many requests')) {
    return { title: e.rateLimit.title, description: e.rateLimit.description };
  }

  if (lower.includes('invalid api key') || lower.includes('invalid_api_key') || lower.includes('unauthorized')) {
    return {
      title: e.invalidKey.title,
      description: e.invalidKey.description,
      action: { label: e.openSettings, href: '/settings' },
    };
  }

  if (
    lower.includes('insufficient') &&
    (lower.includes('quota') || lower.includes('balance') || lower.includes('funds'))
  ) {
    return {
      title: e.insufficientBalance.title,
      description: e.insufficientBalance.description,
      action: { label: e.openSettings, href: '/settings' },
    };
  }

  if (lower.includes('model not found') || lower.includes('model_not_found')) {
    return {
      title: e.modelNotFound.title,
      description: e.modelNotFound.description,
      action: { label: e.openSettings, href: '/settings' },
    };
  }

  if (lower.includes('context length') || lower.includes('context_length_exceeded')) {
    return { title: e.contextLength.title, description: e.contextLength.description };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { title: e.timeout.title, description: e.timeout.description };
  }

  return null;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = CHAT_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatHelpersRef = useRef<{
    addToolOutput?: (options: { tool: string; toolCallId: string; output: unknown }) => PromiseLike<void> | void;
  }>({});
  const [isListening, setIsListening] = useState(false);
  const [activeExercise, setActiveExercise] = useState<'translation' | 'fill-blank' | 'quiz' | 'dictation' | null>(
    null,
  );
  const [toolNotice, setToolNotice] = useState('');
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<'library' | 'search' | null>(null);

  const { speak } = useTTS();

  const inputValue = useChatStore((s) => s.inputValue);
  const providerNotice = useChatStore((s) => s.providerNotice);
  const chatMode = useChatStore((s) => s.chatMode);
  const activeContentItem = useChatStore((s) => s.activeContentItem);
  const activeContentId = useChatStore((s) => s.activeContentId);
  const panelSize = useChatStore((s) => s.panelSize);
  const conversationId = useChatStore((s) => s.conversationId);
  const storedMessages = useChatStore((s) => s.messages);
  const conversationList = useChatStore((s) => s.conversationList);
  const persistMessages = useChatStore((s) => s.setMessages);
  const loadConversationList = useChatStore((s) => s.loadConversationList);
  const switchConversation = useChatStore((s) => s.switchConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const setProviderNotice = useChatStore((s) => s.setProviderNotice);
  const setActiveContent = useChatStore((s) => s.setActiveContent);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const newConversation = useChatStore((s) => s.newConversation);

  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const globalMaxTokens = useProviderStore((s) => s.globalMaxTokens);
  const effectiveMaxTokens = providers[activeProviderId]?.maxTokens ?? globalMaxTokens;
  const activeConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];
  const ollamaModelStatus = useProviderStore((s) => s.ollamaModelStatus);
  const ollamaFirstUse = useProviderStore((s) => s.ollamaFirstUse);
  const setOllamaStatus = useProviderStore((s) => s.setOllamaStatus);
  const setActiveProvider = useProviderStore((s) => s.setActiveProvider);
  const setSelectedModel = useProviderStore((s) => s.setSelectedModel);
  const setAuth = useProviderStore((s) => s.setAuth);
  const setBaseUrl = useProviderStore((s) => s.setBaseUrl);

  useOllamaPreload(true);

  const currentLevel = useAssessmentStore((s) => s.currentLevel);
  const setCurrentLevel = useAssessmentStore((s) => s.setCurrentLevel);

  const contentItems = useContentStore((s) => s.items);
  const loadContents = useContentStore((s) => s.loadContents);
  const addContent = useContentStore((s) => s.addContent);
  const getItemById = useContentStore((s) => s.getItemById);

  useEffect(() => {
    void loadConversationList();
    if (contentItems.length === 0) {
      void loadContents();
    }
  }, [contentItems.length, loadContents, loadConversationList]);

  useEffect(() => {
    if (!activeContentId || activeContentItem || contentItems.length === 0) return;
    const item = contentItems.find((content) => content.id === activeContentId);
    if (item) {
      setActiveContent(item.id, item);
    }
  }, [activeContentId, activeContentItem, contentItems, setActiveContent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const providerNoticeSetterRef = useRef(setProviderNotice);
  useEffect(() => {
    providerNoticeSetterRef.current = setProviderNotice;
  }, [setProviderNotice]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          const effectiveProviderId = response.headers.get('x-provider-id');
          const fallbackApplied = response.headers.get('x-provider-fallback') === 'true';

          if (effectiveProviderId) {
            providerNoticeSetterRef.current(
              fallbackApplied ? `Using ${effectiveProviderId} fallback for chat` : `Using ${effectiveProviderId}`,
            );
          } else {
            providerNoticeSetterRef.current('');
          }

          return response;
        },
      }),
    [],
  );

  const buildApiHeaders = useCallback(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const mockMode = window.localStorage.getItem('echotype_e2e_chat_mock');
      if (mockMode) {
        headers['x-echotype-e2e-chat-mock'] = mockMode;
      }
    }
    if (activeConfig?.auth.apiKey) {
      headers[providerDef.headerKey] = activeConfig.auth.apiKey;
    } else if (activeConfig?.auth.accessToken) {
      headers[providerDef.headerKey] = activeConfig.auth.accessToken;
    }
    return headers;
  }, [activeConfig, providerDef.headerKey]);

  const buildChatRequestOptions = useCallback(
    (overrides?: { chatMode?: typeof chatMode }): ChatRequestOptions => {
      const context = {
        module: 'general',
        chatMode: overrides?.chatMode ?? chatMode,
        contentTitle: activeContentItem?.title,
        contentText: activeContentItem?.text,
        contentType: activeContentItem?.type,
      };

      return {
        headers: buildApiHeaders(),
        body: {
          provider: activeProviderId,
          providerConfigs: providers,
          context,
          userLevel: currentLevel,
          maxTokens: effectiveMaxTokens,
        },
      };
    },
    [activeContentItem, activeProviderId, buildApiHeaders, chatMode, currentLevel, effectiveMaxTokens, providers],
  );

  const updateProviderConfig = useCallback(
    (config: { providerId: string; apiKey?: string; model?: string; baseUrl?: string }) => {
      const providerId = config.providerId as ProviderId;
      setActiveProvider(providerId);
      if (config.apiKey) {
        setAuth(providerId, { type: 'api-key', apiKey: config.apiKey });
      }
      if (config.model) {
        setSelectedModel(providerId, config.model);
      }
      if (config.baseUrl) {
        setBaseUrl(providerId, config.baseUrl);
      }
    },
    [setActiveProvider, setAuth, setBaseUrl, setSelectedModel],
  );

  const {
    messages: uiMessages,
    sendMessage,
    addToolOutput,
    status,
    error,
  } = useChat({
    id: conversationId,
    messages: storedMessages,
    transport,
    onToolCall: async ({ toolCall }) => {
      const result = await executeTool(toolCall.toolName, toolCall.input as Record<string, unknown>, {
        router: { push: (href) => navigateApp(href, router) },
        addContent,
        getActiveContent: () => useChatStore.getState().activeContentItem,
        getContentById: (id) => getItemById(id) ?? contentItems.find((item) => item.id === id),
        searchLibrary: (query, type) => {
          const normalized = query.toLowerCase();
          return contentItems.filter((item) => {
            if (type && item.type !== type) return false;
            return (
              item.title.toLowerCase().includes(normalized) ||
              item.text.toLowerCase().includes(normalized) ||
              item.tags.some((tag) => tag.toLowerCase().includes(normalized))
            );
          });
        },
        setActiveContent,
        setChatMode,
        setExerciseType: setActiveExercise,
        speakText: async (text) => {
          const playback = await speak(text);
          if (!playback) throw new Error('Text-to-speech could not start. Check speech settings and try again.');
        },
        updateUserLevel: (level) => setCurrentLevel(level as CEFRLevel),
        updateProviderConfig,
        buildApiHeaders,
        providerId: activeProviderId,
        providerConfigs: providers as Record<string, unknown>,
        targetLang: useTTSStore.getState().targetLang,
        currentDifficulty: activeContentItem?.difficulty ?? cefrToDifficulty(currentLevel),
      });

      queueMicrotask(() => {
        void chatHelpersRef.current.addToolOutput?.({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      });
      setToolNotice(result.message);
    },
    onFinish: () => {
      setOllamaStatus(activeProviderId === 'ollama' ? 'ready' : ollamaModelStatus);
    },
    onError: () => {
      if (activeProviderId === 'ollama') {
        setOllamaStatus('error');
      }
    },
    sendAutomaticallyWhen: ({ messages }) => lastAssistantMessageIsCompleteWithToolCalls({ messages }),
  });

  chatHelpersRef.current.addToolOutput = addToolOutput;

  useEffect(() => {
    persistMessages(uiMessages);
  }, [persistMessages, uiMessages]);

  useEffect(() => {
    const streaming = status === 'submitted' || status === 'streaming';
    setIsStreaming(streaming);
    if (!streaming && activeProviderId === 'ollama') {
      setOllamaStatus('ready');
    }
  }, [activeProviderId, setIsStreaming, setOllamaStatus, status]);

  const isStreaming = status === 'submitted' || status === 'streaming';

  const renderedMessages = uiMessages
    .map(toRenderableChatMessage)
    .filter((message): message is NonNullable<typeof message> => message !== null);

  const sendChatText = useCallback(
    async (text: string, overrides?: { chatMode?: typeof chatMode }) => {
      const nextText = text.trim();
      if (!nextText || isStreaming) return;

      setInputValue('');
      setProviderNotice('');
      setToolNotice('');

      if (activeProviderId === 'ollama') {
        setOllamaStatus('generating');
      }

      await sendMessage({ text: nextText }, buildChatRequestOptions(overrides));
    },
    [
      activeProviderId,
      buildChatRequestOptions,
      isStreaming,
      sendMessage,
      setInputValue,
      setOllamaStatus,
      setProviderNotice,
    ],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendChatText(inputValue);
    },
    [inputValue, sendChatText],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInputValue(text);
      setIsListening(false);
    },
    [setInputValue],
  );

  const panelWidth = panelSize === 'expanded' ? 'w-[600px]' : 'w-[420px]';
  const panelHeight = panelSize === 'expanded' ? 'h-[85vh]' : 'h-[70vh]';
  const dockClasses = getChatDockClasses(pathname);

  const qa = t.quickActions;
  const quickActions = [
    { icon: MessageSquare, label: qa.dailyChat, prompt: qa.dailyChatPrompt },
    { icon: PenLine, label: qa.grammarCheck, prompt: qa.grammarCheckPrompt },
    { icon: BookOpen, label: qa.librarySearch, prompt: qa.librarySearchPrompt },
    { icon: Languages, label: qa.translate, prompt: qa.translatePrompt },
    { icon: Headphones, label: qa.importUrl, prompt: qa.importUrlPrompt },
    { icon: BarChart3, label: qa.myProgress, prompt: qa.myProgressPrompt },
  ];

  return (
    <Card
      data-testid="chat-panel"
      className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-6 ${dockClasses.panel} ${panelWidth} ${panelHeight} max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-6rem)] md:max-h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl border border-line bg-surface py-0 shadow-2xl transition-all duration-300 z-50 flex flex-col gap-0`}
    >
      <div className="px-4 py-3 border-b border-line flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-5 h-5 text-brand-ink shrink-0" />
          <span className="font-semibold text-ink text-sm truncate">{t.header.title}</span>
          <span className="text-[10px] text-brand-muted bg-brand-soft px-1.5 py-0.5 rounded shrink-0">
            {providerDef.name}
          </span>
          {chatMode !== 'general' && (
            <span className="text-[10px] text-white bg-brand px-1.5 py-0.5 rounded-full shrink-0 capitalize">
              {chatMode}
            </span>
          )}
          {activeExercise && (
            <span className="text-[10px] text-brand-ink bg-brand-tint px-1.5 py-0.5 rounded-full shrink-0">
              {activeExercise}
            </span>
          )}
        </div>

        {activeProviderId === 'ollama' && (
          <OllamaStatusIndicator status={ollamaModelStatus} isFirstUse={ollamaFirstUse} />
        )}

        <div className="flex items-center gap-1 ml-2 shrink-0">
          <ChatHistory
            conversationList={conversationList}
            currentConversationId={conversationId}
            onNewConversation={() => void newConversation()}
            onSwitchConversation={(id) => {
              setActiveExercise(null);
              return switchConversation(id);
            }}
            onDeleteConversation={(id) => {
              setActiveExercise(null);
              return deleteConversation(id);
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="text-ink-4 hover:text-ink-2 cursor-pointer transition-colors p-1"
            id="chat-close"
            aria-label={t.header.closeChat}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeContentItem && (
        <div className="px-4 py-1.5 bg-brand-soft/50 border-b border-line flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-brand-ink shrink-0">{t.content.practicing}</span>
          <span className="text-xs text-brand-ink font-medium truncate">{activeContentItem.title}</span>
          <button
            type="button"
            onClick={() => {
              setActiveContent(null, null);
              setChatMode('general');
              setActiveExercise(null);
            }}
            className="text-brand-muted hover:text-brand-ink cursor-pointer transition-colors ml-auto shrink-0"
            aria-label={t.content.clearContent}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {activeUtilityPanel === 'library' && (
        <ChatContentPicker
          activeContentId={activeContentId}
          onClose={() => setActiveUtilityPanel(null)}
          onSelect={(item) => {
            setActiveContent(item.id, item);
            setActiveExercise(null);
            setActiveUtilityPanel(null);
          }}
        />
      )}

      {activeUtilityPanel === 'search' && (
        <ChatSearchPanel
          onClose={() => setActiveUtilityPanel(null)}
          onSelectContent={(id) => {
            const item = getItemById(id) ?? contentItems.find((content) => content.id === id);
            if (!item) return;
            setActiveContent(item.id, item);
            setActiveExercise(null);
            setActiveUtilityPanel(null);
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin" ref={scrollRef}>
        <div className="space-y-4">
          {providerNotice && (
            <div className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-xs text-warning-ink">
              {providerNotice}
            </div>
          )}
          {toolNotice && (
            <div className="rounded-lg border border-success-line bg-success-soft px-3 py-2 text-xs text-success-ink">
              {toolNotice}
            </div>
          )}
          {error &&
            renderedMessages.at(-1)?.role !== 'assistant' &&
            (() => {
              const rawMsg = error.message.startsWith('{') ? '' : error.message;
              const parsed = rawMsg ? parseProviderError(rawMsg, t) : null;

              if (parsed) {
                return (
                  <div className="rounded-xl border border-danger-line bg-danger-soft px-3.5 py-3 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-danger-ink">{parsed.title}</p>
                        <p className="mt-0.5 text-danger-ink leading-relaxed">{parsed.description}</p>
                        {parsed.action?.href && (
                          <button
                            type="button"
                            onClick={() => navigateApp(parsed.action!.href!, router)}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-danger-line bg-surface px-2.5 py-1 text-[11px] font-medium text-danger-ink hover:bg-danger-soft cursor-pointer transition-colors"
                          >
                            <Settings className="w-3 h-3" />
                            {parsed.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-xs text-danger-ink">
                  {rawMsg || t.errors.fallback}
                </div>
              );
            })()}
          {renderedMessages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="w-8 h-8 mx-auto mb-2 text-brand-muted" />
              <p className="text-brand-ink text-sm font-medium">{t.emptyState.greeting}</p>
              <p className="text-brand-muted text-xs mt-1 mb-4">{t.emptyState.hint}</p>
              <div className="grid grid-cols-2 gap-2 text-left">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => void sendChatText(action.prompt)}
                    disabled={isStreaming}
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-xs text-brand-ink hover:bg-brand-soft hover:border-brand-line transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <action.icon className="w-4 h-4 text-brand-muted shrink-0" />
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {renderedMessages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}
          {isStreaming && (
            <div className="flex gap-2 justify-start" aria-live="polite" data-testid="chat-streaming-indicator">
              <div className="w-7 h-7 rounded-full bg-brand-tint flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-brand-ink" />
              </div>
              <div className="rounded-xl px-3 py-2 text-sm bg-brand-soft text-brand-muted break-words">
                {t.status.thinking}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <ChatToolbar
          activePanel={activeUtilityPanel}
          isListening={isListening}
          onLibraryToggle={() => setActiveUtilityPanel((panel) => (panel === 'library' ? null : 'library'))}
          onMicToggle={() => setIsListening((value) => !value)}
          onSearchToggle={() => setActiveUtilityPanel((panel) => (panel === 'search' ? null : 'search'))}
        />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-line flex gap-2 shrink-0">
        {isListening && <ChatVoiceInput onTranscript={handleVoiceTranscript} />}
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={activeContentItem ? t.input.placeholderContent : t.input.placeholderGeneral}
          className="flex-1 bg-surface/50 border-brand-line text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || isStreaming}
          className="bg-brand hover:bg-brand-strong cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
