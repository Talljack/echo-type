'use client';

import { Clock, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

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
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <Card className="bg-surface border-line shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-sm text-brand-muted">
            <Clock className="mb-2 h-8 w-8 text-on-brand" />
            {emptyLabel}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-surface gap-0 border-line shadow-sm divide-y divide-line">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href}>
                <div className="group flex cursor-pointer items-center gap-3 p-3 transition-all duration-200 hover:bg-brand-soft/50 hover:translate-x-0.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.colorClass}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-brand-muted">{item.subtitle}</p>
                  </div>
                  {item.accuracy > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.accuracy >= 90
                          ? 'bg-success-soft text-success-ink'
                          : item.accuracy >= 70
                            ? 'bg-warning-soft text-warning-ink'
                            : 'bg-danger-soft text-danger'
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
