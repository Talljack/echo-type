'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useProviderStore } from '@/stores/provider-store';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { useOllamaPreload } from '@/hooks/use-ollama-preload';
import { OllamaStatusIndicator } from '@/components/ollama/ollama-status-indicator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const activeConfig = providers[activeProviderId];
  const providerDef = PROVIDER_REGISTRY[activeProviderId];
  const ollamaModelStatus = useProviderStore((s) => s.ollamaModelStatus);
  const ollamaFirstUse = useProviderStore((s) => s.ollamaFirstUse);
  const setOllamaStatus = useProviderStore((s) => s.setOllamaStatus);

  // Preload Ollama model when chat panel is open
  useOllamaPreload(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    // Set generating status for Ollama
    if (activeProviderId === 'ollama') {
      setOllamaStatus('generating');
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
    };

    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInputValue('');
    setIsStreaming(true);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (activeConfig.auth.apiKey) {
      headers[providerDef.headerKey] = activeConfig.auth.apiKey;
    } else if (activeConfig.auth.accessToken) {
      headers[providerDef.headerKey] = activeConfig.auth.accessToken;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          provider: activeProviderId,
          modelId: activeConfig.selectedModelId,
          context: { module: 'general', contentTitle: '' },
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to fetch');

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsStreaming(false);
      // Reset Ollama status to ready after generation
      if (activeProviderId === 'ollama') {
        setOllamaStatus('ready');
      }
    }
  }, [inputValue, isStreaming, messages, activeProviderId, activeConfig, providerDef, setOllamaStatus]);

  return (
    <Card className="fixed bottom-24 right-6 w-[400px] h-[500px] bg-white/90 backdrop-blur-xl border-indigo-100 shadow-xl rounded-2xl flex flex-col z-40 overflow-hidden">
      <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bot className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="font-semibold text-indigo-900 text-sm truncate">AI English Tutor</span>
          <span className="text-[10px] text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
            {providerDef.name}
          </span>
        </div>

        {/* Ollama status indicator */}
        {activeProviderId === 'ollama' && (
          <OllamaStatusIndicator
            status={ollamaModelStatus}
            isFirstUse={ollamaFirstUse}
          />
        )}

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors ml-2 shrink-0"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-indigo-400 text-sm py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 text-indigo-300" />
              <p>Hi! I&apos;m your English tutor.</p>
              <p>Ask me anything about English!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-indigo-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-900'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-indigo max-w-none [&>p]:m-0">
                    <ReactMarkdown>{msg.content || 'Thinking...'}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-green-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-3 border-t border-indigo-100 flex gap-2 shrink-0">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me anything..."
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
