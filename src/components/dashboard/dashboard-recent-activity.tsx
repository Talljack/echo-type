'use client';

import { Clock, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { Card, CardContent } from '@/components/ui/card';
import { detectIOSNativeHost } from '@/lib/tauri';

export interface DashboardRecentActivityItem {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  accuracy: number;
  colorClass: string;
  icon: LucideIcon;
}

interface DashboardRecentActivityProps {
  title: string;
  emptyLabel: string;
  items: DashboardRecentActivityItem[];
}

export function DashboardRecentActivity({ title, emptyLabel, items }: DashboardRecentActivityProps) {
  const isIOSNativeHost = detectIOSNativeHost();

  return (
    <div className="space-y-4">
      <h2
        className={
          isIOSNativeHost
            ? 'text-lg font-semibold tracking-[-0.02em] text-slate-900'
            : 'text-xl font-semibold text-indigo-900'
        }
      >
        {title}
      </h2>
      {items.length === 0 ? (
        <Card
          className={
            isIOSNativeHost
              ? `${IOS_SECTION_CARD_CLASS} gap-0 border-white/75 bg-white/82 py-0`
              : 'bg-white border-slate-100 shadow-sm'
          }
        >
          <CardContent
            className={
              isIOSNativeHost
                ? 'flex flex-col items-center justify-center py-10 text-center text-sm text-slate-400'
                : 'flex flex-col items-center justify-center py-10 text-center text-sm text-indigo-400'
            }
          >
            <Clock className={isIOSNativeHost ? 'mb-2 h-8 w-8 text-slate-300' : 'mb-2 h-8 w-8 text-indigo-200'} />
            {emptyLabel}
          </CardContent>
        </Card>
      ) : (
        <Card
          className={
            isIOSNativeHost
              ? `${IOS_SECTION_CARD_CLASS} gap-0 divide-y divide-slate-100 border-white/75 bg-white/82 py-0`
              : 'bg-white gap-0 border-slate-100 shadow-sm divide-y divide-slate-100'
          }
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href}>
                <div
                  className={
                    isIOSNativeHost
                      ? 'group flex cursor-pointer items-center gap-3 p-3 transition-all duration-200 hover:bg-slate-50/80'
                      : 'group flex cursor-pointer items-center gap-3 p-3 transition-all duration-200 hover:bg-indigo-50/50 hover:translate-x-0.5'
                  }
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.colorClass}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        isIOSNativeHost
                          ? 'truncate text-sm font-medium text-slate-900'
                          : 'truncate text-sm font-medium text-indigo-900'
                      }
                    >
                      {item.title}
                    </p>
                    <p className={isIOSNativeHost ? 'text-xs text-slate-500' : 'text-xs text-indigo-400'}>
                      {item.subtitle}
                    </p>
                  </div>
                  {item.accuracy > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.accuracy >= 90
                          ? 'bg-green-100 text-green-700'
                          : item.accuracy >= 70
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {item.accuracy}%
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
