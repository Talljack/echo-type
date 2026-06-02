'use client';

import { Crosshair } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { IOSInlineChatButton } from '@/components/chat/ios-inline-chat-button';
import { IOS_PAGE_CONTAINER_CLASS, IOS_SECTION_CARD_CLASS, IOSPageHeader } from '@/components/shared/ios-native-ui';
import { WeakSpotList } from '@/components/weak-spots/weak-spot-list';
import { WeakSpotSummary } from '@/components/weak-spots/weak-spot-summary';
import { detectIOSNativeHost, reportNativeQAState } from '@/lib/tauri';
import { useWeakSpotsStore } from '@/stores/weak-spots-store';

export default function WeakSpotsPage() {
  const items = useWeakSpotsStore((s) => s.items);
  const moduleFilter = useWeakSpotsStore((s) => s.moduleFilter);
  const load = useWeakSpotsStore((s) => s.load);
  const setModuleFilter = useWeakSpotsStore((s) => s.setModuleFilter);
  const markResolved = useWeakSpotsStore((s) => s.markResolved);
  const isIOSNativeHost = detectIOSNativeHost();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const reload = () => {
      void load();
    };

    window.addEventListener('echotype:bootstrap-ready', reload);
    return () => {
      window.removeEventListener('echotype:bootstrap-ready', reload);
    };
  }, [load]);

  const openItems = useMemo(() => items.filter((item) => !item.resolved), [items]);

  useEffect(() => {
    reportNativeQAState({
      page: 'weak-spots',
      totalCount: items.length,
      openCount: openItems.length,
      filter: moduleFilter,
      hasItems: items.length > 0,
    });
  }, [items.length, moduleFilter, openItems.length]);

  return (
    <div className={isIOSNativeHost ? IOS_PAGE_CONTAINER_CLASS : 'mx-auto max-w-5xl space-y-6'}>
      {isIOSNativeHost ? (
        <IOSPageHeader
          icon={Crosshair}
          tone="slate"
          title="Weak Spots"
          description="Review the phrases, sentences, and listening moments that still need a little extra work."
          badge={`${openItems.length} open`}
          action={<IOSInlineChatButton iconOnly className="shrink-0 self-start" />}
        />
      ) : (
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-indigo-900">Weak Spots</h1>
          <p className="text-sm text-indigo-500">
            Review the phrases, sentences, and listening moments that still need a little extra work.
          </p>
        </div>
      )}

      <WeakSpotSummary items={items} />

      <div
        className={
          isIOSNativeHost
            ? `${IOS_SECTION_CARD_CLASS} p-4`
            : 'rounded-xl border border-slate-100 bg-white p-5 shadow-sm'
        }
      >
        <div className="mb-4 space-y-1">
          <h2
            className={
              isIOSNativeHost
                ? 'text-lg font-semibold tracking-[-0.02em] text-slate-950'
                : 'text-lg font-semibold text-indigo-900'
            }
          >
            Most urgent weak spots
          </h2>
          <p className={isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'text-sm text-indigo-400'}>
            {openItems.length > 0
              ? 'Retry these items directly to close the loop from practice to review.'
              : 'You are caught up for now.'}
          </p>
        </div>

        <WeakSpotList
          items={items}
          filter={moduleFilter}
          onFilterChange={setModuleFilter}
          onResolve={(id) => void markResolved(id)}
        />
      </div>
    </div>
  );
}
