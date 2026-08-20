'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatFab } from '@/components/chat/chat-fab';
import { CommandPalette } from '@/components/layout/command-palette';
import { MobileMenuButton } from '@/components/layout/mobile-menu-button';
import { Sidebar } from '@/components/layout/sidebar';
import { SelectionTranslationProvider } from '@/components/selection-translation/selection-translation-provider';
import { ShadowReadingCompletion } from '@/components/shared/shadow-reading-completion';
import { ShadowReadingStatusBar } from '@/components/shared/shadow-reading-status-bar';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { LOCAL_DATABASE_CHANGED_EVENT } from '@/lib/db';
import { I18nProvider } from '@/lib/i18n/provider';
import { hydrateIOSNativeQA } from '@/lib/ios-native-qa';
import { seedDatabase } from '@/lib/seed';
import { detectIOSNativeHost, IS_TAURI } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useContentStore } from '@/stores/content-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useFavoriteStore } from '@/stores/favorite-store';
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

function getNativeHostSearchParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('nativeHost');
}

const PRIMARY_APP_ROUTES = [
  '/dashboard',
  '/listen',
  '/speak',
  '/pronunciation',
  '/read',
  '/write',
  '/review/today',
  '/journal',
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [seeded, setSeeded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [isIOSNativeHost, setIsIOSNativeHost] = useState(
    () => getNativeHostSearchParam() === 'ios' || (typeof window !== 'undefined' ? detectIOSNativeHost() : false),
  );

  useEffect(() => {
    const syncNativeHostState = () => {
      setIsIOSNativeHost(getNativeHostSearchParam() === 'ios' || detectIOSNativeHost());
    };

    syncNativeHostState();
    const retryTimers = [150, 400, 900].map((delay) => window.setTimeout(syncNativeHostState, delay));
    window.addEventListener('echotype:native-ready', syncNativeHostState);

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('echotype:native-ready', syncNativeHostState);
    };
  }, []);

  useEffect(() => {
    const handleNativeChatToggle = () => {
      useChatStore.getState().toggleOpen();
    };

    const handleNativeNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; replace?: boolean }>).detail;
      const path = detail?.path;
      if (!path) return;

      const nextParams = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
      if (isIOSNativeHost) {
        nextParams.set('nativeHost', 'ios');
      }

      const nextHref = nextParams.toString() ? `${path}?${nextParams.toString()}` : path;
      if (detail?.replace) {
        router.replace(nextHref);
        return;
      }

      router.push(nextHref);
    };

    window.addEventListener('echotype:native-chat-toggle', handleNativeChatToggle);
    window.addEventListener('echotype:native-navigate', handleNativeNavigate as EventListener);
    return () => {
      window.removeEventListener('echotype:native-chat-toggle', handleNativeChatToggle);
      window.removeEventListener('echotype:native-navigate', handleNativeNavigate as EventListener);
    };
  }, [isIOSNativeHost, router]);

  useEffect(() => {
    if (!isIOSNativeHost || getNativeHostSearchParam() === 'ios') return;

    const nextParams = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    nextParams.set('nativeHost', 'ios');
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [isIOSNativeHost, pathname, router]);

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

  useEffect(() => {
    document.documentElement.dataset.nativeHost = isIOSNativeHost ? 'ios' : 'web';
    document.body.dataset.nativeHost = isIOSNativeHost ? 'ios' : 'web';

    return () => {
      delete document.documentElement.dataset.nativeHost;
      delete document.body.dataset.nativeHost;
    };
  }, [isIOSNativeHost]);

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
      await hydrateIOSNativeQA();
      if (cancelled) return;

      setSeeded(true);

      void useContentStore.getState().loadContents(true);
      cancelWarmup = scheduleBackgroundTask(() => {
        void useFavoriteStore.getState().loadFavorites(true);
      });
    })();

    void useProviderStore.getState().hydrate();
    useAssessmentStore.getState().hydrate();
    useDailyPlanStore.getState().hydrate();
    usePracticeTranslationStore.getState().hydrate();
    useShadowReadingStore.getState().hydrate();
    useShortcutStore.getState().hydrate();
    useSyncStore.getState().hydrate();
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
    'global:shadow-next-module': () => {
      const store = useShadowReadingStore.getState();
      if (!store.session) return;
      const next = store.getNextIncompleteModule();
      if (next) {
        const paths: Record<string, string> = { listen: '/listen', read: '/read', write: '/write' };
        router.push(`${paths[next]}/${store.session.contentId}`);
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

  return (
    <I18nProvider>
      <div
        className={
          isIOSNativeHost
            ? 'flex h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_48%,#f7f9fc_100%)]'
            : 'flex h-screen overflow-hidden bg-slate-50'
        }
      >
        {/* Backdrop - only visible on mobile when sidebar open */}
        {sidebarOpen && !isIOSNativeHost && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        {!isIOSNativeHost && <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />}
        <SelectionTranslationProvider>
          <main
            className={isIOSNativeHost ? 'relative flex-1 overflow-y-auto overflow-x-hidden' : 'flex-1 overflow-y-auto'}
            data-native-host={isIOSNativeHost ? 'ios' : 'web'}
            data-seeded={seeded}
          >
            {isIOSNativeHost && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_68%)]"
              />
            )}
            <ShadowReadingStatusBar />
            {!isIOSNativeHost && <MobileMenuButton onClick={() => setSidebarOpen(true)} />}
            <div
              className={
                isIOSNativeHost
                  ? 'relative min-h-full px-4 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+7.5rem)] md:px-5'
                  : 'min-h-full px-6 pt-16 pb-6 md:p-8'
              }
            >
              {seeded ? children : null}
            </div>
          </main>
        </SelectionTranslationProvider>
        <ChatFab />
        <ShadowReadingCompletion />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </I18nProvider>
  );
}
