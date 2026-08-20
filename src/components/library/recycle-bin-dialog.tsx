'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ContentItem } from '@/types/content';

export function RecycleBinDialog({
  items,
  open,
  onOpenChange,
  onRestore,
  onDelete,
}: {
  items: ContentItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recycle Bin</DialogTitle>
          <DialogDescription>Restore content or permanently remove it from this device.</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No deleted content.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.type}</p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Restore ${item.title}`}
                  onClick={() => void onRestore(item.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Permanently delete ${item.title}`}
                  onClick={() => {
                    if (window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) {
                      void onDelete(item.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
