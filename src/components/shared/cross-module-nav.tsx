'use client';

import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Module = 'listen' | 'read' | 'speak' | 'write';

const MODULE_CONFIG: Record<Module, { icon: typeof Headphones; label: string; path: string }> = {
  listen: { icon: Headphones, label: 'Listen', path: '/listen' },
  read: { icon: BookOpen, label: 'Read', path: '/read' },
  speak: { icon: Mic, label: 'Speak', path: '/read' },
  write: { icon: PenLine, label: 'Write', path: '/write' },
};

const CONTENT_MODULES: Module[] = ['listen', 'read', 'write'];

interface CrossModuleNavProps {
  contentId: string;
  currentModule: Module;
}

export function CrossModuleNav({ contentId, currentModule }: CrossModuleNavProps) {
  const otherModules = CONTENT_MODULES.filter((m) => m !== currentModule);

  return (
    <div className="flex items-center gap-1">
      {otherModules.map((mod) => {
        const { icon: Icon, label, path } = MODULE_CONFIG[mod];
        return (
          <Link
            key={mod}
            href={`${path}/${contentId}`}
            title={`Practice in ${label} mode`}
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
