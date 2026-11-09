import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { container: 'min-h-[30vh]', icon: 'w-5 h-5', ring: 'w-10 h-10' },
  md: { container: 'min-h-[50vh]', icon: 'w-6 h-6', ring: 'w-12 h-12' },
  lg: { container: 'min-h-[60vh]', icon: 'w-8 h-8', ring: 'w-16 h-16' },
};

export function PageSpinner({ className, size = 'md' }: PageSpinnerProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center justify-center', s.container, className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className={cn('absolute inset-0 rounded-full bg-brand-line/50 blur-xl', s.ring)} />
          <div
            className={cn(
              'relative flex items-center justify-center rounded-full border border-surface/80 bg-surface/92 shadow-[0_16px_36px_rgba(79,70,229,0.12)]',
              s.ring,
            )}
          >
            <Loader2 className={cn('animate-spin text-brand-ink', s.icon)} />
          </div>
        </div>
        <p className="text-xs font-medium tracking-[0.08em] text-ink-4">Loading</p>
      </div>
    </div>
  );
}
