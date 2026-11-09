'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getChatDockClasses } from '@/lib/chat-dock-layout';
import { useChatStore } from '@/stores/chat-store';
import { ChatPanel } from './chat-panel';

export function ChatFab() {
  const pathname = usePathname();
  const isOpen = useChatStore((s) => s.isOpen);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const setIsOpen = useChatStore((s) => s.setIsOpen);
  const dockClasses = getChatDockClasses(pathname);
  const [mounted, setMounted] = useState(false);

  // Hydrate chat messages on first mount
  useEffect(() => {
    useChatStore.getState().hydrate();
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}</>;
  }

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] md:bottom-6 ${dockClasses.fab} z-50 flex size-12 cursor-pointer items-center justify-center rounded-2xl bg-ink text-canvas shadow-lg transition-[transform,background-color] duration-200 hover:-translate-y-0.5 md:size-14`}
          aria-label="Open AI chat"
          title="AI tutor"
        >
          <MessageCircle className="size-5 md:size-6" />
        </button>
      )}
    </>
  );
}
