'use client';

import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSyncStore } from '@/stores/sync-store';

function formatLastSynced(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export function SyncIndicator() {
  const { status, lastSyncedAt, error, isSyncEnabled, triggerIncrementalSync, setSyncEnabled, hydrate } =
    useSyncStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const iconClass = 'w-4 h-4';

  const statusIcon =
    status === 'syncing' ? (
      <Loader2 className={cn(iconClass, 'animate-spin text-indigo-500')} />
    ) : status === 'error' || !isSyncEnabled ? (
      <CloudOff className={cn(iconClass, 'text-slate-400')} />
    ) : status === 'synced' ? (
      <Cloud className={cn(iconClass, 'text-emerald-500')} />
    ) : (
      <Cloud className={cn(iconClass, 'text-slate-400')} />
    );

  const statusLabel =
    status === 'syncing'
      ? 'Syncing...'
      : status === 'error'
        ? 'Sync error'
        : !isSyncEnabled
          ? 'Sync off'
          : status === 'synced'
            ? 'Synced'
            : 'Cloud sync';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          title={statusLabel}
        >
          {statusIcon}
          <span className="hidden sm:inline">{statusLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Cloud Sync</p>
          <p className="text-xs text-slate-500">Last synced: {formatLastSynced(lastSyncedAt)}</p>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700">Enable sync</span>
          <button
            type="button"
            role="switch"
            aria-checked={isSyncEnabled}
            onClick={() => setSyncEnabled(!isSyncEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none',
              isSyncEnabled ? 'bg-indigo-600' : 'bg-slate-200',
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                isSyncEnabled ? 'translate-x-4.5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs cursor-pointer"
          disabled={!isSyncEnabled || status === 'syncing'}
          onClick={() => void triggerIncrementalSync()}
        >
          <RefreshCw className={cn('w-3 h-3 mr-1.5', status === 'syncing' && 'animate-spin')} />
          Sync now
        </Button>
      </PopoverContent>
    </Popover>
  );
}
