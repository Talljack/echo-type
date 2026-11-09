'use client';

import { MotionConfig } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatFab } from '@/components/chat/chat-fab';
import { CommandPalette } from '@/components/layout/command-palette';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Sidebar } from '@/components/layout/sidebar';
import { LearningSectionNav } from '@/components/learning/learning-section-nav';
import { SelectionTranslationProvider } from '@/components/selection-translation/selection-translation-provider';
import { ShadowReadingCompletion } from '@/components/shared/shadow-reading-completion';
import { ShadowReadingStatusBar } from '@/components/shared/shadow-reading-status-bar';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { navigateApp } from '@/lib/app-navigation';
import { LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { initializeDesktopSettingsPersistence } from '@/lib/desktop-settings-storage';
import { I18nProvider } from '@/lib/i18n/provider';
import { reconcileLearningUnits } from '@/lib/learning-unit-repository';
import { seedDatabase } from '@/lib/seed';
import { IS_TAURI } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useContentStore } from '@/stores/content-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useSyncStore } from '@/stores/sync-store';
import { useTTSStore } from '@/stores/tts-store';
import { useUpdaterStore } from '@/stores/updater-store';

function scheduleBackgroundTask(task: () => void) {
  if (typeof globalThis.window === 'undefined') return () => {};

  const win = globalThis.window as Window &
    typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof win.requestIdleCallback === 'function' && typeof win.cancelIdleCallback === 'function') {
    const handle = win.requestIdleCallback(() => task(), { timeout: 1200 });
    return () => win.cancelIdleCallback?.(handle);
  }

  const handle = globalThis.setTimeout(task, 0);
  return () => globalThis.clearTimeout(handle);
}

const PRIMARY_APP_ROUTES = ['/dashboard', '/learn', '/library', '/review', '/favorites', '/speak', '/pronunciation'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);

  useEffect(() => {
    if (!IS_TAURI) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen('echotype:check-for-updates', async () => {
          const updater = useUpdaterStore.getState();
          if (updater.status === 'available' || updater.status === 'downloaded') {
            updater.openDialog();
            return;
          }

          await updater.checkForUpdate();
          const result = useUpdaterStore.getState();
          if (
            result.status === 'available' ||
            result.status === 'downloaded' ||
            result.status === 'up-to-date' ||
            result.status === 'error'
          ) {
            result.openDialog();
          }
        }),
      )
      .then((disposeListener) => {
        if (disposed) disposeListener();
        else unlisten = disposeListener;
      })
      .catch((error) => console.error('Failed to register the native update menu:', error));

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const cancelPrefetch = scheduleBackgroundTask(() => {
      for (const route of PRIMARY_APP_ROUTES) {
        if (route !== pathname) {
          router.prefetch(route);
        }
      }
    });

    return cancelPrefetch;
  }, [pathname, router]);

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
    const refreshUserScopedData = () => {
      if (!seeded) return;
      void seedDatabase().then(() => {
        void useContentStore.getState().loadContents(true);
        void useFavoriteStore.getState().loadFavorites(true);
      });
    };

    window.addEventListener(LOCAL_DATABASE_CHANGED_EVENT, refreshUserScopedData);
    return () => window.removeEventListener(LOCAL_DATABASE_CHANGED_EVENT, refreshUserScopedData);
  }, [seeded]);

  useEffect(() => {
    let cancelled = false;
    let cancelWarmup = () => {};

    void (async () => {
      try {
        await useAuthStore.getState().initialize();
      } catch {
        // Continue in the anonymous local database when auth initialization is unavailable.
      }

      await seedDatabase();
      // Migration is additive and retryable; a failure must not block the old app.
      await reconcileLearningUnits().catch((error) => console.warn('Course preparation deferred', error));
      if (cancelled) return;

      setSeeded(true);

      void useContentStore.getState().loadContents(true);
      cancelWarmup = scheduleBackgroundTask(() => {
        void useFavoriteStore.getState().loadFavorites(true);
      });
    })();

    void initializeDesktopSettingsPersistence()
      .catch((error) => console.warn('[Desktop Settings] Restore failed', error))
      .finally(() => {
        void useProviderStore.getState().hydrate();
        useAssessmentStore.getState().hydrate();
        useDailyPlanStore.getState().hydrate();
        usePracticeTranslationStore.getState().hydrate();
        useShadowReadingStore.getState().hydrate();
        useShortcutStore.getState().hydrate();
        useSyncStore.getState().hydrate();
      });
    void useAuthStore.getState().initialize();

    if (IS_TAURI) {
      void useUpdaterStore.getState().checkForUpdate();
      useUpdaterStore.getState().startPeriodicCheck();
    }

    return () => {
      cancelled = true;
      cancelWarmup();
      useUpdaterStore.getState().stopPeriodicCheck();
    };
  }, []);

  useEffect(() => {
    if (!seeded) return;
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event('echotype:bootstrap-ready')));
    return () => window.cancelAnimationFrame(frame);
  }, [seeded]);

  useShortcuts('global', {
    'global:command-palette': () => setCommandPaletteOpen((open) => !open),
    'global:open-settings': () => navigateApp('/settings', router),
    'global:toggle-chat': () => useChatStore.getState().toggleOpen(),
    'global:nav-listen': () => navigateApp('/listen', router),
    'global:nav-speak': () => navigateApp('/speak', router),
    'global:nav-read': () => navigateApp('/read', router),
    'global:nav-write': () => navigateApp('/write', router),
    'global:speed-down': () => adjustTTSSetting('speed', -0.1, 0.5, 2, useTTSStore.getState().setSpeed),
    'global:speed-up': () => adjustTTSSetting('speed', 0.1, 0.5, 2, useTTSStore.getState().setSpeed),
    'global:pitch-down': () => adjustTTSSetting('pitch', -0.1, 0.5, 2, useTTSStore.getState().setPitch),
    'global:pitch-up': () => adjustTTSSetting('pitch', 0.1, 0.5, 2, useTTSStore.getState().setPitch),
    'global:volume-down': () => adjustTTSSetting('volume', -0.1, 0, 1, useTTSStore.getState().setVolume),
    'global:volume-up': () => adjustTTSSetting('volume', 0.1, 0, 1, useTTSStore.getState().setVolume),
    'global:stop-tts': () => window.dispatchEvent(new Event('echotype:stop-tts')),
    'global:nav-favorites': () => navigateApp('/favorites', router),
    'global:toggle-selection-translate': () =>
      useFavoriteStore.getState().setSelectionTranslateEnabled(!useFavoriteStore.getState().selectionTranslateEnabled),
    'global:shadow-next-module': () => {
      const store = useShadowReadingStore.getState();
      if (!store.session) return;
      const next = store.getNextIncompleteModule();
      if (next) {
        const paths: Record<string, string> = { listen: '/listen', read: '/read', write: '/write' };
        navigateApp(`${paths[next]}/${store.session.contentId}`, router);
      }
    },
    'global:shadow-end-session': () => {
      useShadowReadingStore.getState().requestEndSession();
    },
  });

  // Close sidebar on route change (mobile)
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on pathname change is intentional
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const skipLinkLabel = interfaceLanguage === 'zh' ? '跳到主要内容' : 'Skip to main content';

  return (
    <I18nProvider>
      {/* Honour the OS "reduce motion" setting for every framer-motion animation in the app. */}
      <MotionConfig reducedMotion="user">
        <div className="flex h-dvh overflow-hidden bg-canvas">
          <a
            href="#main-content"
            className="sr-only z-[60] rounded-lg bg-surface px-4 py-2 text-sm font-medium text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {skipLinkLabel}
          </a>
          {/* Backdrop - only visible on mobile when the drawer is open */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-[rgb(20_18_14/0.42)] backdrop-blur-[2px] transition-opacity duration-200 md:hidden dark:bg-black/60"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <Sidebar
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            onOpenSearch={() => {
              setSidebarOpen(false);
              setCommandPaletteOpen(true);
            }}
          />
          <SelectionTranslationProvider>
            <main
              id="main-content"
              tabIndex={-1}
              className="scrollbar-thin flex-1 overflow-y-auto focus:outline-none"
              data-seeded={seeded}
            >
              <ShadowReadingStatusBar />
              <div className="min-h-full px-5 pt-6 pb-28 sm:px-8 md:px-10 md:pt-10 md:pb-12">
                {seeded && <LearningSectionNav />}
                {seeded ? (
                  children
                ) : (
                  <div className="mx-auto max-w-6xl space-y-4" aria-busy="true">
                    <div className="h-10 w-48 animate-pulse rounded-xl bg-surface-2" />
                    <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
                  </div>
                )}
              </div>
            </main>
          </SelectionTranslationProvider>
          <MobileTabBar onOpenMore={() => setSidebarOpen(true)} />
          <ChatFab />
          <ShadowReadingCompletion />
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        </div>
      </MotionConfig>
    </I18nProvider>
  );
}
