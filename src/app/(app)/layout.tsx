'use client';

import { useEffect } from 'react';
import { seedDatabase } from '@/lib/seed';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatFab } from '@/components/chat/chat-fab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
      <ChatFab />
    </div>
  );
}
