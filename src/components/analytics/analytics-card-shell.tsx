'use client';

import type React from 'react';
import { IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';

interface AnalyticsCardShellProps {
  title: string;
  titleSuffix?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function AnalyticsCardShell({ title, titleSuffix, children, contentClassName }: AnalyticsCardShellProps) {
  const isIOSNativeHost = detectIOSNativeHost();
  const titleToneClass = isIOSNativeHost ? 'text-slate-700' : 'text-indigo-600';

  return (
    <Card
      className={cn(
        isIOSNativeHost
          ? `${IOS_SECTION_CARD_CLASS} gap-0 border-white/75 bg-white/84 py-0`
          : 'bg-white border-slate-100 shadow-sm',
      )}
    >
      <CardHeader className={cn('pb-2', isIOSNativeHost && 'px-5 pt-5 pb-3')}>
        <CardTitle className={cn('text-sm font-medium', titleToneClass)}>
          {title}
          {typeof titleSuffix === 'string' ? (
            <span className={cn('ml-2 text-xs font-normal', titleToneClass)}>{titleSuffix}</span>
          ) : (
            titleSuffix
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(isIOSNativeHost && 'px-5 pb-5', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
