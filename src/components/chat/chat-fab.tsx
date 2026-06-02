'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getChatDockClasses } from '@/lib/chat-dock-layout';
import { detectIOSNativeHost } from '@/lib/tauri';
import { useChatStore } from '@/stores/chat-store';
import { ChatPanel } from './chat-panel';

function getNativeHostSearchParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nativeHost');
}

export function ChatFab() {
  const pathname = usePathname();
  const isOpen = useChatStore((s) => s.isOpen);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const setIsOpen = useChatStore((s) => s.setIsOpen);
  const dockClasses = getChatDockClasses(pathname);
  const [isIOSNativeHost, setIsIOSNativeHost] = useState(
    () => getNativeHostSearchParam() === 'ios' || (typeof window !== 'undefined' ? detectIOSNativeHost() : false),
  );

  // Hydrate chat messages on first mount
  useEffect(() => {
    useChatStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const syncNativeHostState = () => {
      setIsIOSNativeHost(getNativeHostSearchParam() === 'ios' || detectIOSNativeHost());
    };

    syncNativeHostState();
    window.addEventListener('echotype:native-ready', syncNativeHostState);

    return () => {
      window.removeEventListener('echotype:native-ready', syncNativeHostState);
    };
  }, []);

  const fabBottomClass = isIOSNativeHost ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+6.75rem)]' : 'bottom-6';

  if (isIOSNativeHost) {
    return <>{isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}</>;
  }

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleOpen}
          className={`fixed ${fabBottomClass} ${dockClasses.fab} z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all duration-200 hover:bg-indigo-700 ${isIOSNativeHost ? 'ring-1 ring-white/60 shadow-[0_18px_36px_rgba(79,70,229,0.32)]' : ''} cursor-pointer`}
          aria-label="Open AI chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
