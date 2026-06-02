'use client';

import { BookOpen, Headphones, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';
import { IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { Card, CardContent } from '@/components/ui/card';
import { detectIOSNativeHost } from '@/lib/tauri';
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
  const isIOSNativeHost = detectIOSNativeHost();

  return (
    <div className="space-y-4 lg:col-span-2">
      <h2
        className={
          isIOSNativeHost
            ? 'text-lg font-semibold tracking-[-0.02em] text-slate-900'
            : 'text-xl font-semibold text-indigo-900'
        }
      >
        {title}
      </h2>
      <div
        className={isIOSNativeHost ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}
      >
        {modules.map((mod) => {
          const Icon = ICON_MAP[mod.icon];
          return (
            <Link key={mod.href} href={mod.href}>
              <Card
                className={
                  isIOSNativeHost
                    ? `${IOS_SECTION_CARD_CLASS} group gap-0 border-white/75 bg-white/82 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.10)]`
                    : 'group cursor-pointer bg-white border-slate-100 shadow-sm transition-all duration-200 hover:shadow-lg'
                }
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={
                      isIOSNativeHost
                        ? `flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${mod.color} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`
                        : `flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${mod.color}`
                    }
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className={
                        isIOSNativeHost
                          ? 'font-semibold text-slate-900 transition-colors group-hover:text-slate-700'
                          : 'font-semibold text-indigo-900 transition-colors group-hover:text-indigo-700'
                      }
                    >
                      {mod.label}
                    </h3>
                    <p className={cn(isIOSNativeHost ? 'text-xs leading-5 text-slate-500' : 'text-xs text-indigo-500')}>
                      {mod.desc}
                    </p>
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
