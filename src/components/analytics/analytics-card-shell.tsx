'use client';

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnalyticsCardShellProps {
  title: string;
  titleSuffix?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function AnalyticsCardShell({ title, titleSuffix, children, contentClassName }: AnalyticsCardShellProps) {
  const titleToneClass = 'text-brand-ink';

  return (
    <Card className={cn('bg-surface border-line shadow-sm')}>
      <CardHeader className={cn('pb-2')}>
        <CardTitle className={cn('text-sm font-medium', titleToneClass)}>
          {title}
          {typeof titleSuffix === 'string' ? (
            <span className={cn('ml-2 text-xs font-normal', titleToneClass)}>{titleSuffix}</span>
          ) : (
            titleSuffix
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}
