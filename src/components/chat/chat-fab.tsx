'use client';

import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { ChatPanel } from './chat-panel';

export function ChatFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center cursor-pointer z-50"
        aria-label={isOpen ? 'Close chat' : 'Open AI chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
}
