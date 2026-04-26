'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { WeakSpot } from '@/types/weak-spot';

export function WeakSpotList({
  items,
  filter,
  onFilterChange,
  onResolve,
}: {
  items: WeakSpot[];
  filter: 'all' | WeakSpot['module'];
  onFilterChange: (value: 'all' | WeakSpot['module']) => void;
  onResolve: (id: string) => void;
}) {
  const filtered = items.filter((item) => !item.resolved && (filter === 'all' || item.module === filter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['all', 'listen', 'speak', 'read', 'write'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => onFilterChange(value)}
            className={
              filter === value
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
            }
          >
            {value === 'all' ? 'All' : value}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-8 text-center text-sm text-indigo-400 shadow-sm">
          No weak spots here yet. Finish a practice session and EchoType will start surfacing what needs work.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium uppercase text-indigo-600">
                      {item.module}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                      {item.weakSpotType}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                      Seen {item.count}x
                    </span>
                  </div>
                  <p className="text-sm font-medium text-indigo-900">{item.text}</p>
                  <p className="text-xs text-indigo-400">{item.reason}</p>
                  {typeof item.accuracy === 'number' && (
                    <p className="text-xs text-slate-500">Latest accuracy: {item.accuracy}%</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={item.targetHref}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      Retry
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => onResolve(item.id)}>
                    Resolve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
