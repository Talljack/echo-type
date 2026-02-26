'use client';

import { useEffect, useState } from 'react';
import { seedDatabase } from '@/lib/seed';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatFab } from '@/components/chat/chat-fab';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    seedDatabase().then(() => setSeeded(true));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6" data-seeded={seeded}>
        {children}
      </main>
      <ChatFab />
    </div>
  );
}
