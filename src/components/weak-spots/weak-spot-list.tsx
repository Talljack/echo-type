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
            onClick={() => {
              onFilterChange(value);
            }}
            data-testid={`weak-spots-filter-${value}`}
            aria-label={`Weak spots filter ${value}`}
            className={
              filter === value
                ? 'bg-brand hover:bg-brand-strong'
                : 'border-brand-line text-brand-ink hover:bg-brand-soft'
            }
          >
            {value === 'all' ? 'All' : value}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-5 py-8 text-center text-sm text-brand-muted shadow-sm">
          No weak spots here yet. Finish a practice session and EchoType will start surfacing what needs work.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-line bg-surface p-4 shadow-sm"
              data-testid={`weak-spot-card-${item.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                      {item.module}
                    </span>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-ink-3">
                      {item.weakSpotType}
                    </span>
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] text-warning-ink">
                      Seen {item.count}x
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink">{item.text}</p>
                  <p className="text-xs text-brand-muted">{item.reason}</p>
                  {typeof item.accuracy === 'number' && (
                    <p className="text-xs text-ink-3">Latest accuracy: {item.accuracy}%</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={item.targetHref}>
                    <Button
                      size="sm"
                      className="bg-brand hover:bg-brand-strong"
                      data-testid={`weak-spot-retry-${item.id}`}
                      aria-label={`Retry weak spot ${item.id}`}
                    >
                      Retry
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onResolve(item.id);
                    }}
                    data-testid={`weak-spot-resolve-${item.id}`}
                    aria-label={`Resolve weak spot ${item.id}`}
                  >
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
