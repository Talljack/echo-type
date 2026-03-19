'use client';

import { BookOpen, Headphones, MessageCircle, Settings2, SquarePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatKeyCombo } from '@/hooks/use-shortcuts';
import { isMac } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useShortcutStore } from '@/stores/shortcut-store';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const getKey = useShortcutStore((s) => s.getKey);
  const setPaused = useShortcutStore((s) => s.setPaused);
  const searchKey = formatKeyCombo(getKey('global:command-palette'));
  const defaultSearchKey = isMac() ? 'Command+K' : 'Ctrl+K';

  useEffect(() => {
    setPaused(open);

    return () => {
      setPaused(false);
    };
  }, [open, setPaused]);

  const items = useMemo(
    () => [
      {
        id: 'global:open-settings',
        label: 'Open Settings',
        icon: Settings2,
        action: () => router.push('/settings'),
      },
      {
        id: 'global:toggle-chat',
        label: 'Toggle Chat',
        icon: MessageCircle,
        action: () => useChatStore.getState().toggleOpen(),
      },
      {
        id: 'global:nav-listen',
        label: 'Go to Listen',
        icon: Headphones,
        action: () => router.push('/listen'),
      },
      {
        id: 'global:nav-speak',
        label: 'Go to Speak',
        icon: MessageCircle,
        action: () => router.push('/speak'),
      },
      {
        id: 'global:nav-read',
        label: 'Go to Read',
        icon: BookOpen,
        action: () => router.push('/read'),
      },
      {
        id: 'global:nav-write',
        label: 'Go to Write',
        icon: SquarePen,
        action: () => router.push('/write'),
      },
    ],
    [router],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and run global navigation and workspace actions.
        </DialogDescription>
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search actions..." autoFocus />
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
            Open search with <span className="font-medium text-slate-700">{searchKey}</span>
            {searchKey !== defaultSearchKey ? <span className="ml-1">(default: {defaultSearchKey})</span> : null}
          </div>
          <CommandList className="max-h-[380px] p-2">
            <CommandEmpty className="text-slate-500">No matching actions.</CommandEmpty>
            <CommandGroup heading="Actions">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      onOpenChange(false);
                      item.action();
                    }}
                    className="justify-between rounded-lg px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span>{item.label}</span>
                    </span>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                      {formatKeyCombo(getKey(item.id))}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
