'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { ChatPanel } from './chat-panel';

export function ChatFab() {
  const isOpen = useChatStore((s) => s.isOpen);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const setIsOpen = useChatStore((s) => s.setIsOpen);

  // Hydrate chat messages on first mount
  useEffect(() => {
    useChatStore.getState().hydrate();
  }, []);

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center cursor-pointer z-50"
          aria-label="Open AI chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
