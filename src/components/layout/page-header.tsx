import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Standard page header: optional back link / eyebrow, display-serif title,
 * one-line description and right-aligned actions.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  actions,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {back ? (
          <Link
            href={back.href}
            className="-ml-1 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.015em] text-ink break-words sm:text-[34px]">
          {title}
        </h1>
        {description ? <p className="max-w-2xl text-[15px] leading-relaxed text-ink-3">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Section title used inside pages (sans, compact). */
export function SectionTitle({
  title,
  description,
  action,
  className,
  as: Tag = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <Tag className="text-[15px] font-semibold text-ink">{title}</Tag>
        {description ? <p className="mt-0.5 text-sm text-ink-3">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Friendly empty state with an icon, message and optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3 [&>svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {description ? <p className="mx-auto max-w-md text-sm text-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
