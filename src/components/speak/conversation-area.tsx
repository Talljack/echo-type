'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ConversationMessage } from '@/types/scenario';
import { MessageBubble } from './message-bubble';

interface ConversationAreaProps {
  messages: ConversationMessage[];
  scenarioTitle: string;
  onPlayVoice?: (text: string, messageId: string) => void;
  onToggleTranslation?: (messageId: string) => void;
}

export function ConversationArea({ messages, onPlayVoice, onToggleTranslation }: ConversationAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-indigo-400 text-sm py-12">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="font-medium text-indigo-500">Ready to practice?</p>
            <p className="text-indigo-300 mt-1">Tap the microphone to start speaking</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onPlayVoice={onPlayVoice}
            onToggleTranslation={onToggleTranslation}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
