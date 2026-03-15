'use client';

import { ChevronDown, History, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Conversation } from '@/types/chat';

interface ChatHistoryProps {
  conversationList: Conversation[];
  currentConversationId: string;
  onNewConversation: () => void | Promise<void>;
  onSwitchConversation: (id: string) => void | Promise<void>;
  onDeleteConversation: (id: string) => void | Promise<void>;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

export function ChatHistory({
  conversationList,
  currentConversationId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
}: ChatHistoryProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
          aria-label="Conversation history"
          title="Conversation history"
        >
          <History className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 border-indigo-100 bg-white/95 backdrop-blur-xl p-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void onNewConversation()}
          className="w-full justify-start border-indigo-100 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>

        <div className="mt-2 max-h-80 overflow-y-auto scrollbar-thin">
          {conversationList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              No previous conversations
            </div>
          ) : (
            <div className="space-y-1">
              {conversationList.map((conversation) => {
                const isActive = conversation.id === currentConversationId;

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                      isActive ? 'border-indigo-200 bg-indigo-50/70' : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void onSwitchConversation(conversation.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="truncate text-sm font-medium text-slate-800">{conversation.title}</div>
                      <div className="text-xs text-slate-500">{formatRelativeTime(conversation.updatedAt)}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDeleteConversation(conversation.id)}
                      className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-red-500 transition-colors cursor-pointer"
                      aria-label={`Delete ${conversation.title}`}
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
