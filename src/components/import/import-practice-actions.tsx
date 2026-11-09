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
    <Card className="bg-surface border-line shadow-sm">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Import complete</p>
          <p className="text-sm text-brand-ink">{title}</p>
        </div>

        <div className="space-y-3">
          <Link href="/learn" className="block rounded-xl bg-brand p-4 font-semibold text-white hover:bg-brand-strong">
            Open as a course · 作为课程学习
          </Link>
          {actions.map((action) => {
            const Icon = moduleIcons[action.module];
            return (
              <Link
                key={action.id}
                href={action.href}
                data-testid={`import-practice-action-${action.module}`}
                aria-label={`Import practice ${action.module}`}
                className="block rounded-xl border border-line p-4 transition-colors hover:bg-brand-soft/60"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      action.priority === 'primary' ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">{action.title}</p>
                      {action.priority === 'primary' && (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success-ink">
                          Start here
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted">{action.reason}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <Link href={backHref}>
          <Button
            data-testid="import-back-to-library"
            aria-label="Back to library after import"
            variant="outline"
            className="w-full border-brand-line text-brand-ink hover:bg-brand-soft"
          >
            Save and go to library
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
