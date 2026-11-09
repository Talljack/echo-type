import { cn } from '@/lib/utils';

/**
 * EchoType mark: a typed "E" with two echo arcs. Teal sheet, paper-white
 * letterform, marker-yellow echo — the three core colours of Studio Paper.
 */
export function BrandMark({ className, title = 'EchoType' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id="et-mark-bg" x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#13897a" />
          <stop offset="1" stopColor="#095b50" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#et-mark-bg)" />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16.25" fill="none" stroke="#fff" strokeOpacity="0.14" />
      <g fill="#fbf8f1">
        <rect x="15" y="15" width="7.5" height="34" rx="3.2" />
        <rect x="15" y="15" width="22" height="7.2" rx="3.2" />
        <rect x="15" y="28.6" width="18" height="6.8" rx="3" />
        <rect x="15" y="41.8" width="22" height="7.2" rx="3.2" />
      </g>
      <g fill="none" stroke="#fbe08a" strokeLinecap="round">
        <path d="M41.5 26.5a8 8 0 0 1 0 11" strokeWidth="3.6" />
        <path d="M46.5 21.5a15 15 0 0 1 0 21" stroke="#f6edcb" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function BrandWordmark({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <span className={cn('flex min-w-0 flex-col leading-none', className)}>
      <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">EchoType</span>
      {subtitle ? <span className="mt-1 truncate text-[11px] font-medium text-ink-3">{subtitle}</span> : null}
    </span>
  );
}
