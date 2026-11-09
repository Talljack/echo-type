'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useFavoriteStore } from '@/stores/favorite-store';

// Focus on mount, except on touch devices where it would pop up the on-screen keyboard.
function focusUnlessTouch(element: HTMLInputElement | null) {
  if (element && !window.matchMedia('(pointer: coarse)').matches) element.focus();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['📚', '🎯', '💼', '🌍', '🔬', '🎨', '🏠', '✈️', '🍔', '🎵'];

export function FolderManageDialog({ open, onOpenChange }: Props) {
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
      <DialogContent className={cn('max-w-md')}>
        <DialogHeader>
          <DialogTitle>管理收藏夹</DialogTitle>
        </DialogHeader>

        {/* Create new */}
        <div className={cn('flex items-center gap-2')}>
          <select
            data-testid="favorites-folder-emoji-select"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className={cn('h-10 w-14 text-center border rounded-xl bg-surface')}
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
            className={cn('flex-1 h-9')}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button data-testid="favorites-folder-create" size="sm" onClick={handleCreate} disabled={!newName.trim()}>
            创建
          </Button>
        </div>

        {/* Existing folders */}
        <div className={cn('mt-2 space-y-1')}>
          {folders.map((f) => {
            const isReserved = f.id === 'default' || f.id === 'auto';
            return (
              <div
                key={f.id}
                data-testid={`favorites-folder-row-${f.id}`}
                className={cn('flex items-center gap-2 rounded px-2 py-1.5 hover:bg-surface-2')}
              >
                <span className="text-sm">{f.emoji}</span>
                {editingId === f.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleUpdate(f.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(f.id)}
                    className={cn('flex-1 h-7 text-sm')}
                    ref={focusUnlessTouch}
                  />
                ) : (
                  <span className="flex-1 text-sm text-ink-2">{f.name}</span>
                )}
                {!isReserved && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`favorites-folder-edit-${f.id}`}
                      className={cn('h-7 w-7')}
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
                      className={cn('h-7 w-7 text-danger hover:text-danger')}
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
