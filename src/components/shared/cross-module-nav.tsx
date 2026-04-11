'use client';

import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react';
import Link from 'next/link';
import enPracticeUi from '@/lib/i18n/messages/practice-ui/en.json';
import zhPracticeUi from '@/lib/i18n/messages/practice-ui/zh.json';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';

const PRACTICE_UI_LOCALES = { en: enPracticeUi, zh: zhPracticeUi } as const;

type Module = 'listen' | 'read' | 'speak' | 'write';

const MODULE_ICONS: Record<Module, typeof Headphones> = {
  listen: Headphones,
  read: BookOpen,
  speak: Mic,
  write: PenLine,
};

const MODULE_PATHS: Record<Module, string> = {
  listen: '/listen',
  read: '/read',
  speak: '/read',
  write: '/write',
};

const CONTENT_MODULES: Module[] = ['listen', 'read', 'write'];

interface CrossModuleNavProps {
  contentId: string;
  currentModule: Module;
}

export function CrossModuleNav({ contentId, currentModule }: CrossModuleNavProps) {
  const navT = PRACTICE_UI_LOCALES[useLanguageStore((s) => s.interfaceLanguage)].crossModuleNav;
  const otherModules = CONTENT_MODULES.filter((m) => m !== currentModule);

  return (
    <div className="flex items-center gap-1">
      {otherModules.map((mod) => {
        const Icon = MODULE_ICONS[mod];
        const label = navT[mod];
        const path = MODULE_PATHS[mod];
        return (
          <Link
            key={mod}
            href={`${path}/${contentId}`}
            title={navT.practiceIn.replace('{{label}}', label)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
              'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
