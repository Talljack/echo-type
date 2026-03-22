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

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {/* All chip */}
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            activeFolderId === null ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          All
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFolderId(f.id)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              activeFolderId === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f.emoji} {f.name}
          </button>
        ))}

        {/* New folder button */}
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> 新建
        </button>
      </div>

      <FolderManageDialog open={showManage} onOpenChange={setShowManage} />
    </>
  );
}
