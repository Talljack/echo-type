import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';

type IOSTone = 'indigo' | 'teal' | 'emerald' | 'slate';

const TONE_STYLES: Record<IOSTone, { badge: string; iconWrap: string; icon: string }> = {
  indigo: {
    badge: 'bg-indigo-50 text-indigo-500',
    iconWrap: 'bg-[linear-gradient(135deg,rgba(99,102,241,0.18)_0%,rgba(79,70,229,0.1)_100%)]',
    icon: 'text-indigo-600',
  },
  teal: {
    badge: 'bg-teal-50 text-teal-600',
    iconWrap: 'bg-[linear-gradient(135deg,rgba(20,184,166,0.18)_0%,rgba(13,148,136,0.1)_100%)]',
    icon: 'text-teal-700',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-600',
    iconWrap: 'bg-[linear-gradient(135deg,rgba(16,185,129,0.18)_0%,rgba(5,150,105,0.1)_100%)]',
    icon: 'text-emerald-700',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-600',
    iconWrap: 'bg-[linear-gradient(135deg,rgba(148,163,184,0.18)_0%,rgba(100,116,139,0.1)_100%)]',
    icon: 'text-slate-700',
  },
};

export const IOS_PAGE_HERO_CLASS =
  'rounded-[30px] border border-white/70 bg-white/82 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl';
export const IOS_PAGE_CONTAINER_CLASS = 'max-w-4xl mx-auto space-y-5';
export const IOS_SECTION_CARD_CLASS =
  'rounded-[26px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]';
export const IOS_LIST_CARD_CLASS =
  'rounded-[24px] border border-white/72 bg-white/84 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl';
export const IOS_SUBCARD_CLASS =
  'rounded-[24px] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.88)_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl';
export const IOS_TINTED_SUBCARD_CLASS =
  'rounded-[24px] border border-indigo-100/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.92)_0%,rgba(255,255,255,0.84)_100%)] shadow-[0_14px_32px_rgba(79,70,229,0.07)] backdrop-blur-xl';
export const IOS_EMPTY_STATE_CARD_CLASS =
  'rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,245,249,0.86)_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl';
export const IOS_INPUT_CLASS =
  'h-11 rounded-2xl border-slate-200 bg-slate-100/70 text-slate-900 placeholder:text-slate-400';
export const IOS_PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_6px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl';
export const IOS_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400';
export const IOS_PRIMARY_BUTTON_CLASS =
  'h-10 rounded-full bg-slate-900 px-4 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-slate-800';
export const IOS_TINTED_BUTTON_CLASS =
  'h-10 rounded-full bg-indigo-600 px-4 text-white shadow-[0_12px_26px_rgba(79,70,229,0.2)] hover:bg-indigo-700';
export const IOS_SECONDARY_BUTTON_CLASS =
  'h-10 rounded-full border border-slate-200 px-4 text-slate-700 hover:bg-slate-50';
export const IOS_TERTIARY_BUTTON_CLASS =
  'h-9 rounded-full border border-slate-200/90 bg-white/92 px-3.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900';
export const IOS_SEGMENTED_ACTIVE_CLASS =
  'border-transparent bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.15)]';
export const IOS_SEGMENTED_INACTIVE_CLASS =
  'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50';

interface IOSPageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: string;
  className?: string;
  icon?: LucideIcon | React.ElementType;
  tone?: IOSTone;
}

export function IOSPageHeader({
  title,
  description,
  action,
  badge,
  className,
  icon: Icon,
  tone = 'indigo',
}: IOSPageHeaderProps) {
  const style = TONE_STYLES[tone];

  return (
    <div className={cn(IOS_PAGE_HERO_CLASS, className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          {(badge || Icon) && (
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', style.iconWrap)}>
                  <Icon className={cn('h-5 w-5', style.icon)} />
                </div>
              )}
              {badge && (
                <div
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                    style.badge,
                  )}
                >
                  {badge}
                </div>
              )}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-[var(--font-poppins)] text-[2rem] font-bold tracking-[-0.04em] text-slate-950">
              {title}
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
    </div>
  );
}

interface IOSEmptyStateCardProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon | React.ElementType;
  tone?: IOSTone;
  testId?: string;
  accessibilityLabel?: string;
}

export function IOSEmptyStateCard({
  title,
  description,
  action,
  className,
  icon: Icon,
  tone = 'slate',
  testId,
  accessibilityLabel,
}: IOSEmptyStateCardProps) {
  const style = TONE_STYLES[tone];

  return (
    <div data-testid={testId} className={cn(IOS_EMPTY_STATE_CARD_CLASS, 'px-6 py-8 text-center', className)}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        {accessibilityLabel ? <p className="sr-only">{accessibilityLabel}</p> : null}
        {Icon ? (
          <div className={cn('flex h-16 w-16 items-center justify-center rounded-[22px]', style.iconWrap)}>
            <Icon className={cn('h-7 w-7', style.icon)} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}
