'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatFab } from '@/components/chat/chat-fab';
import { CommandPalette } from '@/components/layout/command-palette';
import { Sidebar } from '@/components/layout/sidebar';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { seedDatabase } from '@/lib/seed';
import { IS_TAURI } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useProviderStore } from '@/stores/provider-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import { useUpdaterStore } from '@/stores/updater-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const router = useRouter();

  const adjustTTSSetting = (
    key: 'speed' | 'pitch' | 'volume',
    delta: number,
    min: number,
    max: number,
    setter: (value: number) => void,
  ) => {
    const currentValue = useTTSStore.getState()[key];
    const nextValue = Math.max(min, Math.min(max, Number((currentValue + delta).toFixed(1))));
    if (nextValue !== currentValue) setter(nextValue);
  };

  useEffect(() => {
    seedDatabase().then(() => setSeeded(true));
    void useProviderStore.getState().hydrate();
    useAssessmentStore.getState().hydrate();
    useDailyPlanStore.getState().hydrate();
    useShortcutStore.getState().hydrate();
    void useAuthStore.getState().initialize();

    if (IS_TAURI) {
      void useUpdaterStore.getState().checkForUpdate();
      useUpdaterStore.getState().startPeriodicCheck();
    }

    return () => {
      useUpdaterStore.getState().stopPeriodicCheck();
    };
  }, []);

  useShortcuts('global', {
    'global:command-palette': () => setCommandPaletteOpen((open) => !open),
    'global:open-settings': () => router.push('/settings'),
    'global:toggle-chat': () => useChatStore.getState().toggleOpen(),
    'global:nav-listen': () => router.push('/listen'),
    'global:nav-speak': () => router.push('/speak'),
    'global:nav-read': () => router.push('/read'),
    'global:nav-write': () => router.push('/write'),
    'global:speed-down': () => adjustTTSSetting('speed', -0.1, 0.5, 2, useTTSStore.getState().setSpeed),
    'global:speed-up': () => adjustTTSSetting('speed', 0.1, 0.5, 2, useTTSStore.getState().setSpeed),
    'global:pitch-down': () => adjustTTSSetting('pitch', -0.1, 0.5, 2, useTTSStore.getState().setPitch),
    'global:pitch-up': () => adjustTTSSetting('pitch', 0.1, 0.5, 2, useTTSStore.getState().setPitch),
    'global:volume-down': () => adjustTTSSetting('volume', -0.1, 0, 1, useTTSStore.getState().setVolume),
    'global:volume-up': () => adjustTTSSetting('volume', 0.1, 0, 1, useTTSStore.getState().setVolume),
    'global:stop-tts': () => window.dispatchEvent(new Event('echotype:stop-tts')),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto" data-seeded={seeded}>
        <div className="min-h-full p-6 md:p-8">{children}</div>
      </main>
      <ChatFab />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
