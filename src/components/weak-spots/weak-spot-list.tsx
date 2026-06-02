'use client';

import Link from 'next/link';
import {
  IOS_LIST_CARD_CLASS,
  IOS_SEGMENTED_ACTIVE_CLASS,
  IOS_SEGMENTED_INACTIVE_CLASS,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { detectIOSNativeHost, nativeHaptic } from '@/lib/tauri';
import { cn } from '@/lib/utils';
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
  const isIOSNativeHost = detectIOSNativeHost();
  const filtered = items.filter((item) => !item.resolved && (filter === 'all' || item.module === filter));

  return (
    <div className="space-y-4">
      <div className={isIOSNativeHost ? 'grid grid-cols-3 gap-2 sm:grid-cols-5' : 'flex flex-wrap gap-2'}>
        {(['all', 'listen', 'speak', 'read', 'write'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => {
              nativeHaptic('light');
              onFilterChange(value);
            }}
            data-testid={`weak-spots-filter-${value}`}
            aria-label={`Weak spots filter ${value}`}
            className={
              isIOSNativeHost
                ? cn(
                    'h-10 rounded-full border px-3 text-sm capitalize transition active:scale-[0.98]',
                    filter === value ? IOS_SEGMENTED_ACTIVE_CLASS : IOS_SEGMENTED_INACTIVE_CLASS,
                  )
                : filter === value
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
            }
          >
            {value === 'all' ? 'All' : value}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className={
            isIOSNativeHost
              ? `${IOS_LIST_CARD_CLASS} px-5 py-8 text-center text-sm leading-6 text-slate-500`
              : 'rounded-xl border border-slate-100 bg-white px-5 py-8 text-center text-sm text-indigo-400 shadow-sm'
          }
        >
          No weak spots here yet. Finish a practice session and EchoType will start surfacing what needs work.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={
                isIOSNativeHost
                  ? `${IOS_LIST_CARD_CLASS} p-4`
                  : 'rounded-xl border border-slate-100 bg-white p-4 shadow-sm'
              }
              data-testid={`weak-spot-card-${item.id}`}
            >
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
                  <p
                    className={
                      isIOSNativeHost ? 'text-sm font-semibold text-slate-950' : 'text-sm font-medium text-indigo-900'
                    }
                  >
                    {item.text}
                  </p>
                  <p className={isIOSNativeHost ? 'text-xs leading-5 text-slate-500' : 'text-xs text-indigo-400'}>
                    {item.reason}
                  </p>
                  {typeof item.accuracy === 'number' && (
                    <p className="text-xs text-slate-500">Latest accuracy: {item.accuracy}%</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={item.targetHref} onClick={() => nativeHaptic('medium')}>
                    <Button
                      size="sm"
                      className={
                        isIOSNativeHost
                          ? 'h-10 rounded-full bg-slate-900 px-4 text-white shadow-[0_10px_22px_rgba(15,23,42,0.15)] hover:bg-slate-800'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }
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
                      nativeHaptic('success');
                      onResolve(item.id);
                    }}
                    data-testid={`weak-spot-resolve-${item.id}`}
                    aria-label={`Resolve weak spot ${item.id}`}
                    className={
                      isIOSNativeHost
                        ? 'h-10 rounded-full border-slate-200 px-4 text-slate-700 hover:bg-slate-50'
                        : undefined
                    }
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
