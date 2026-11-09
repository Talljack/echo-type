'use client';

import { BookOpen, Headphones, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  listen: Headphones,
  speak: Mic,
  read: BookOpen,
  write: PenTool,
} as const;

type ModuleIconKey = keyof typeof ICON_MAP;

export interface DashboardModuleItem {
  href: string;
  label: string;
  desc: string;
  color: string;
  icon: ModuleIconKey;
}

interface DashboardModuleGridProps {
  title: string;
  modules: DashboardModuleItem[];
}

export function DashboardModuleGrid({ title, modules }: DashboardModuleGridProps) {
  return (
    <div className="space-y-4 lg:col-span-2">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="group cursor-pointer bg-surface border-line shadow-sm transition-all duration-200 hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mod.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink transition-colors group-hover:text-brand-ink">{mod.label}</h3>
                    <p className={cn('text-xs text-brand-ink')}>{mod.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
