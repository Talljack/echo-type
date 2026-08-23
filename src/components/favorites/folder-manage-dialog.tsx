'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  IOS_INPUT_CLASS,
  IOS_SECTION_CARD_CLASS,
  IOS_SUBCARD_CLASS,
  IOS_TERTIARY_BUTTON_CLASS,
} from '@/components/shared/ios-native-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['📚', '🎯', '💼', '🌍', '🔬', '🎨', '🏠', '✈️', '🍔', '🎵'];

export function FolderManageDialog({ open, onOpenChange }: Props) {
  const isIOSNativeHost = detectIOSNativeHost();
  const folders = useFavoriteStore((s) => s.folders);
  const addFolder = useFavoriteStore((s) => s.addFolder);
  const updateFolder = useFavoriteStore((s) => s.updateFolder);
  const removeFolder = useFavoriteStore((s) => s.removeFolder);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📚');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const maxOrder = Math.max(0, ...folders.map((f) => f.sortOrder));
    await addFolder({ name: newName.trim(), emoji: newEmoji, sortOrder: maxOrder + 1 });
    setNewName('');
    setNewEmoji('📚');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await updateFolder(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('删除后，该收藏夹中的内容将移至默认收藏。确定删除？')) return;
    await removeFolder(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md',
          isIOSNativeHost &&
            'w-[calc(100%-2rem)] rounded-[30px] border-white/70 bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl',
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={isIOSNativeHost ? 'text-xl font-semibold tracking-[-0.03em] text-slate-950' : undefined}
          >
            管理收藏夹
          </DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div
          className={cn(
            isIOSNativeHost ? IOS_SUBCARD_CLASS : 'flex items-center gap-2',
            isIOSNativeHost && 'flex items-center gap-2 p-3',
          )}
        >
          <select
            data-testid="favorites-folder-emoji-select"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className={cn(
              'h-10 w-14 text-center border rounded-xl bg-white',
              isIOSNativeHost && 'border-slate-200/80 bg-slate-100/70',
            )}
          >
            {EMOJI_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <Input
            placeholder="收藏夹名称"
            data-testid="favorites-folder-name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={cn('flex-1 h-9', isIOSNativeHost && IOS_INPUT_CLASS)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button
            data-testid="favorites-folder-create"
            size="sm"
            onClick={handleCreate}
            disabled={!newName.trim()}
            className={
              isIOSNativeHost ? 'h-10 rounded-full bg-indigo-600 px-4 text-white hover:bg-indigo-700' : undefined
            }
          >
            创建
          </Button>
        </div>

        {/* Existing folders */}
        <div className={cn('mt-2 space-y-1', isIOSNativeHost && `${IOS_SECTION_CARD_CLASS} space-y-2 p-3`)}>
          {folders.map((f) => {
            const isReserved = f.id === 'default' || f.id === 'auto';
            return (
              <div
                key={f.id}
                data-testid={`favorites-folder-row-${f.id}`}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50',
                  isIOSNativeHost && 'rounded-2xl border border-slate-100/80 bg-white/80 px-3 py-2.5',
                )}
              >
                <span className="text-sm">{f.emoji}</span>
                {editingId === f.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleUpdate(f.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(f.id)}
                    className={cn('flex-1 h-7 text-sm', isIOSNativeHost && 'h-10 rounded-xl bg-slate-100/70')}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-slate-700">{f.name}</span>
                )}
                {!isReserved && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`favorites-folder-edit-${f.id}`}
                      className={cn('h-7 w-7', isIOSNativeHost && IOS_TERTIARY_BUTTON_CLASS)}
                      onClick={() => {
                        setEditingId(f.id);
                        setEditName(f.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`favorites-folder-delete-${f.id}`}
                      className={cn(
                        'h-7 w-7 text-red-400 hover:text-red-600',
                        isIOSNativeHost && 'rounded-full border border-red-100 bg-red-50/70',
                      )}
                      onClick={() => handleDelete(f.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
