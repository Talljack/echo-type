'use client';

import {
  BookOpen,
  Headphones,
  Heart,
  Library,
  MessageCircle,
  Play,
  RotateCcw,
  Settings2,
  SquarePen,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatKeyCombo } from '@/hooks/use-shortcuts';
import { navigateApp } from '@/lib/app-navigation';
import { db } from '@/lib/db';
import enCommandPalette from '@/lib/i18n/messages/command-palette/en.json';
import zhCommandPalette from '@/lib/i18n/messages/command-palette/zh.json';
import { PRIMARY_LEARNING_LINKS } from '@/lib/learning-navigation';
import { isMac } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useLanguageStore } from '@/stores/language-store';
import { useShortcutStore } from '@/stores/shortcut-store';

const CP_LOCALES = { en: enCommandPalette, zh: zhCommandPalette } as const;

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const lang = useLanguageStore((s) => s.interfaceLanguage);
  const t = CP_LOCALES[lang];
  const router = useRouter();
  const getKey = useShortcutStore((s) => s.getKey);
  const setPaused = useShortcutStore((s) => s.setPaused);
  const searchKey = formatKeyCombo(getKey('global:command-palette'));
  const defaultSearchKey = isMac() ? 'Command+K' : 'Ctrl+K';
  const [lastPracticeHref, setLastPracticeHref] = useState<string | null>(null);

  useEffect(() => {
    setPaused(open);

    return () => {
      setPaused(false);
    };
  }, [open, setPaused]);

  const loadLastPractice = useCallback(async () => {
    try {
      const sessions = await db.sessions.toArray();
      const completed = sessions.filter((s) => s.completed);
      if (completed.length === 0) return;
      const latest = completed.sort((a, b) => (b.endTime ?? b.startTime) - (a.endTime ?? a.startTime))[0];
      const mod = latest.module === 'speak' ? 'read' : latest.module || 'write';
      setLastPracticeHref(`/${mod}/${latest.contentId}`);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) loadLastPractice();
  }, [open, loadLastPractice]);

  const items = useMemo(
    () => [
      ...PRIMARY_LEARNING_LINKS.filter((link) => ['today', 'courses', 'pronunciation'].includes(link.section)).map(
        (link) => ({
          id: `navigation:${link.section}`,
          label: link[lang],
          icon: link.section === 'pronunciation' ? Volume2 : BookOpen,
          action: () => navigateApp(link.href, router),
        }),
      ),
      {
        id: 'global:open-settings',
        label: t.actions.openSettings,
        icon: Settings2,
        action: () => navigateApp('/settings', router),
      },
      {
        id: 'global:toggle-chat',
        label: t.actions.toggleChat,
        icon: MessageCircle,
        action: () => useChatStore.getState().toggleOpen(),
      },
      {
        id: 'global:nav-review',
        label: t.actions.goToReview,
        icon: RotateCcw,
        action: () => navigateApp('/review', router),
      },
      {
        id: 'global:nav-library',
        label: t.actions.goToLibrary,
        icon: Library,
        action: () => navigateApp('/library', router),
      },
      {
        id: 'global:nav-listen',
        label: t.actions.goToListen,
        icon: Headphones,
        action: () => navigateApp('/listen', router),
      },
      {
        id: 'global:nav-speak',
        label: t.actions.goToSpeak,
        icon: MessageCircle,
        action: () => navigateApp('/speak', router),
      },
      {
        id: 'global:nav-read',
        label: t.actions.goToRead,
        icon: BookOpen,
        action: () => navigateApp('/read', router),
      },
      {
        id: 'global:nav-write',
        label: t.actions.goToWrite,
        icon: SquarePen,
        action: () => navigateApp('/write', router),
      },
      {
        id: 'global:nav-favorites',
        label: t.actions.goToFavorites,
        icon: Heart,
        action: () => navigateApp('/favorites', router),
      },
      {
        id: 'global:start-favorites-review',
        label: t.actions.startFavoritesReview,
        icon: Play,
        action: () => navigateApp('/favorites/review', router),
      },
      ...(lastPracticeHref
        ? [
            {
              id: 'global:continue-last',
              label: t.actions.continueLastPractice,
              icon: Play,
              action: () => navigateApp(lastPracticeHref, router),
            },
          ]
        : []),
    ],
    [router, lastPracticeHref, t, lang],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{t.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.description}</DialogDescription>
        <Command shouldFilter={true}>
          <CommandInput placeholder={t.searchPlaceholder} autoFocus />
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
            {t.openSearchWith} <span className="font-medium text-slate-700">{searchKey}</span>
            {searchKey !== defaultSearchKey ? (
              <span className="ml-1">
                ({t.default} {defaultSearchKey})
              </span>
            ) : null}
          </div>
          <CommandList className="max-h-[380px] p-2">
            <CommandEmpty className="text-slate-500">{t.noMatch}</CommandEmpty>
            <CommandGroup heading={t.heading}>
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
