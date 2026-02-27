'use client';

import { useEffect, useState } from 'react';
import { seedDatabase } from '@/lib/seed';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatFab } from '@/components/chat/chat-fab';
import { useProviderStore } from '@/stores/provider-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    seedDatabase().then(() => setSeeded(true));
    useProviderStore.getState().hydrate();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" data-seeded={seeded}>
        <div className="min-h-full p-6 md:p-8">
          {children}
        </div>
      </main>
      <ChatFab />
    </div>
  );
}
