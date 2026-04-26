'use client';

import { BookOpen, Headphones, RotateCcw, Sparkles, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GeneratedPracticeAction } from '@/lib/import-practice-actions';

const moduleIcons = {
  listen: Headphones,
  speak: Sparkles,
  read: BookOpen,
  write: WandSparkles,
  review: RotateCcw,
};

export function ImportPracticeActions({
  title,
  actions,
  backHref = '/library',
}: {
  title: string;
  actions: GeneratedPracticeAction[];
  backHref?: string;
}) {
  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-indigo-900">Import complete</p>
          <p className="text-sm text-indigo-500">{title}</p>
        </div>

        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = moduleIcons[action.module];
            return (
              <Link
                key={action.id}
                href={action.href}
                className="block rounded-xl border border-indigo-100 p-4 transition-colors hover:bg-indigo-50/60"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      action.priority === 'primary' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-indigo-900">{action.title}</p>
                      {action.priority === 'primary' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                          Start here
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-400">{action.reason}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <Link href={backHref}>
          <Button variant="outline" className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            Save and go to library
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
