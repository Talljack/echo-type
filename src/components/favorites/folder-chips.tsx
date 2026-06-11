'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';
import { FolderManageDialog } from './folder-manage-dialog';

export function FolderChips() {
  const isIOSNativeHost = detectIOSNativeHost();
  const folders = useFavoriteStore((s) => s.folders);
  const activeFolderId = useFavoriteStore((s) => s.activeFolderId);
  const setActiveFolderId = useFavoriteStore((s) => s.setActiveFolderId);
  const [showManage, setShowManage] = useState(false);
  const getFolderLabel = (folder: (typeof folders)[number]) => {
    if (!isIOSNativeHost) return folder.name;
    if (folder.id === 'default') return 'Default';
    if (folder.id === 'auto') return 'Smart';
    return folder.name.trim() || 'Folder';
  };
  const chipBaseClass = isIOSNativeHost
    ? 'shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all'
    : 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors';

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1.5 pb-2 scrollbar-none',
          isIOSNativeHost && 'flex-wrap overflow-visible px-1',
          !isIOSNativeHost && 'overflow-x-auto',
        )}
      >
        {/* All chip */}
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          className={cn(
            chipBaseClass,
            activeFolderId === null
              ? isIOSNativeHost
                ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]'
                : 'bg-indigo-600 text-white'
              : isIOSNativeHost
                ? 'border border-white/70 bg-white/90 text-slate-600 hover:bg-slate-50'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
              chipBaseClass,
              activeFolderId === f.id
                ? isIOSNativeHost
                  ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)]'
                  : 'bg-indigo-600 text-white'
                : isIOSNativeHost
                  ? 'border border-white/70 bg-white/90 text-slate-600 hover:bg-slate-50'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {isIOSNativeHost ? getFolderLabel(f) : `${f.emoji} ${f.name}`}
          </button>
        ))}

        {/* New folder button */}
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className={cn(
            'shrink-0 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
            isIOSNativeHost
              ? 'px-3.5 py-2 border border-dashed border-slate-200 bg-white/88 text-slate-500 hover:bg-slate-50'
              : 'px-3 py-1.5 bg-slate-50 text-slate-400 hover:bg-slate-100',
          )}
        >
          <Plus className="h-3 w-3" /> Manage
        </button>
      </div>

      <FolderManageDialog open={showManage} onOpenChange={setShowManage} />
    </>
  );
}
