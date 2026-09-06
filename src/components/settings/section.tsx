import type React from 'react';
import { IOS_EYEBROW_CLASS } from '@/components/shared/ios-native-ui';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';

export function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const isIOSNativeHost = detectIOSNativeHost();
  return (
    <section
      data-testid={`settings-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      aria-label={title}
      className={
        isIOSNativeHost
          ? 'overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]'
          : 'bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden'
      }
    >
      <div
        className={
          isIOSNativeHost
            ? 'flex items-center gap-2.5 bg-slate-50/70 px-4 pb-2.5 pt-4'
            : 'flex items-center gap-2 px-5 py-3.5 border-b border-slate-100'
        }
      >
        <div
          className={isIOSNativeHost ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50' : undefined}
        >
          <Icon className={isIOSNativeHost ? 'h-3.5 w-3.5 text-indigo-600' : 'w-4 h-4 text-slate-400'} />
        </div>
        <div className="min-w-0">
          {isIOSNativeHost ? <p className={cn(IOS_EYEBROW_CLASS, 'tracking-[0.16em]')}>Settings</p> : null}
          <h2
            className={
              isIOSNativeHost
                ? 'text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-600'
                : 'text-sm font-semibold text-slate-800'
            }
          >
            {title}
          </h2>
        </div>
      </div>
      <div className={isIOSNativeHost ? 'space-y-3 px-3 pb-3 pt-2' : 'p-4 md:p-5'}>{children}</div>
    </section>
  );
}
