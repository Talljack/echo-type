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
      <div className={cn('rounded-full bg-indigo-50 flex items-center justify-center', s.ring)}>
        <Loader2 className={cn('animate-spin text-indigo-500', s.icon)} />
      </div>
    </div>
  );
}
