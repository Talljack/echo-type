'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FolderManageDialog } from './folder-manage-dialog';

export function FolderChips() {
  const folders = useFavoriteStore((s) => s.folders);
  const activeFolderId = useFavoriteStore((s) => s.activeFolderId);
  const setActiveFolderId = useFavoriteStore((s) => s.setActiveFolderId);
  const [showManage, setShowManage] = useState(false);
  const chipBaseClass = 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors';

  return (
    <>
      <div className={cn('flex items-center gap-1.5 pb-2 scrollbar-none', 'overflow-x-auto')}>
        {/* All chip */}
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          data-testid="favorites-folder-all"
          className={cn(
            chipBaseClass,
            activeFolderId === null ? 'bg-brand text-white' : 'bg-surface-3 text-ink-2 hover:bg-line',
          )}
        >
          All
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFolderId(f.id)}
            data-testid={`favorites-folder-${f.id}`}
            className={cn(
              chipBaseClass,
              activeFolderId === f.id ? 'bg-brand text-white' : 'bg-surface-3 text-ink-2 hover:bg-line',
            )}
          >
            {`${f.emoji} ${f.name}`}
          </button>
        ))}

        {/* New folder button */}
        <button
          type="button"
          onClick={() => setShowManage(true)}
          data-testid="favorites-folder-manage"
          className={cn(
            'shrink-0 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
            'px-3 py-1.5 bg-surface-2 text-ink-4 hover:bg-surface-3',
          )}
        >
          <Plus className="h-3 w-3" /> Manage
        </button>
      </div>

      <FolderManageDialog open={showManage} onOpenChange={setShowManage} />
    </>
  );
}
