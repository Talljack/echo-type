'use client';

import { useEffect, useMemo } from 'react';
import { WeakSpotList } from '@/components/weak-spots/weak-spot-list';
import { WeakSpotSummary } from '@/components/weak-spots/weak-spot-summary';
import { useWeakSpotsStore } from '@/stores/weak-spots-store';

export default function WeakSpotsPage() {
  const items = useWeakSpotsStore((s) => s.items);
  const moduleFilter = useWeakSpotsStore((s) => s.moduleFilter);
  const load = useWeakSpotsStore((s) => s.load);
  const setModuleFilter = useWeakSpotsStore((s) => s.setModuleFilter);
  const markResolved = useWeakSpotsStore((s) => s.markResolved);

  useEffect(() => {
    void load();
  }, [load]);

  const openItems = useMemo(() => items.filter((item) => !item.resolved), [items]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-indigo-900">Weak Spots</h1>
        <p className="text-sm text-indigo-500">
          Review the phrases, sentences, and listening moments that still need a little extra work.
        </p>
      </div>

      <WeakSpotSummary items={items} />

      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-indigo-900">Most urgent weak spots</h2>
          <p className="text-sm text-indigo-400">
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
