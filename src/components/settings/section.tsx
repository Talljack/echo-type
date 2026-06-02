import type React from 'react';
import { IOS_EYEBROW_CLASS, IOS_SECTION_CARD_CLASS } from '@/components/shared/ios-native-ui';
import { detectIOSNativeHost } from '@/lib/tauri';

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
    <div
      className={
        isIOSNativeHost
          ? `overflow-hidden ${IOS_SECTION_CARD_CLASS}`
          : 'bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden'
      }
    >
      <div
        className={
          isIOSNativeHost
            ? 'flex items-center gap-3 px-5 py-4 border-b border-slate-100/80'
            : 'flex items-center gap-2 px-5 py-3.5 border-b border-slate-100'
        }
      >
        <div
          className={
            isIOSNativeHost
              ? 'flex h-10 w-10 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(148,163,184,0.14)_0%,rgba(100,116,139,0.08)_100%)]'
              : undefined
          }
        >
          <Icon className={isIOSNativeHost ? 'w-4 h-4 text-slate-600' : 'w-4 h-4 text-slate-400'} />
        </div>
        <div className="min-w-0">
          {isIOSNativeHost ? <p className={IOS_EYEBROW_CLASS}>Settings</p> : null}
          <h2
            className={
              isIOSNativeHost ? 'text-[15px] font-semibold text-slate-950' : 'text-sm font-semibold text-slate-800'
            }
          >
            {title}
          </h2>
        </div>
      </div>
      <div className={isIOSNativeHost ? 'p-4 md:p-5' : 'p-4 md:p-5'}>{children}</div>
    </div>
  );
}
