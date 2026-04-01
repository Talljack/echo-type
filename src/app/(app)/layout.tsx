'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatFab } from '@/components/chat/chat-fab';
import { CommandPalette } from '@/components/layout/command-palette';
import { MobileMenuButton } from '@/components/layout/mobile-menu-button';
import { Sidebar } from '@/components/layout/sidebar';
import { SelectionTranslationProvider } from '@/components/selection-translation/selection-translation-provider';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { I18nProvider } from '@/lib/i18n/provider';
import { seedDatabase } from '@/lib/seed';
import { IS_TAURI } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useFavoriteStore } from '@/stores/favorite-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import { useUpdaterStore } from '@/stores/updater-store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
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
    usePracticeTranslationStore.getState().hydrate();
    useShortcutStore.getState().hydrate();
    void useAuthStore.getState().initialize();
    void useFavoriteStore.getState().loadFavorites();

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
    'global:nav-favorites': () => router.push('/favorites'),
    'global:toggle-selection-translate': () =>
      useFavoriteStore.getState().setSelectionTranslateEnabled(!useFavoriteStore.getState().selectionTranslateEnabled),
  });

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Backdrop - only visible on mobile when sidebar open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <SelectionTranslationProvider>
          <main className="flex-1 overflow-y-auto" data-seeded={seeded}>
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <div className="min-h-full pt-16 md:pt-0 p-6 md:p-8">{children}</div>
          </main>
        </SelectionTranslationProvider>
        <ChatFab />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </I18nProvider>
  );
}
