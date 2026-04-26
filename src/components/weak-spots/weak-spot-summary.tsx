'use client';

import type { WeakSpot } from '@/types/weak-spot';

export function WeakSpotSummary({ items }: { items: WeakSpot[] }) {
  const openItems = items.filter((item) => !item.resolved);
  const moduleCounts = {
    listen: openItems.filter((item) => item.module === 'listen').length,
    speak: openItems.filter((item) => item.module === 'speak').length,
    read: openItems.filter((item) => item.module === 'read').length,
    write: openItems.filter((item) => item.module === 'write').length,
  };

  const summaryCards = [
    { label: 'Open weak spots', value: openItems.length },
    { label: 'Listen', value: moduleCounts.listen },
    { label: 'Speak', value: moduleCounts.speak },
    { label: 'Read', value: moduleCounts.read },
    { label: 'Write', value: moduleCounts.write },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {summaryCards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-indigo-500">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
