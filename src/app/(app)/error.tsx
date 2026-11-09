'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-danger" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
          <p className="text-sm text-brand-ink">{error.message || 'An unexpected error occurred.'}</p>
        </div>
        <Button onClick={reset} variant="outline" className="cursor-pointer border-brand-line text-brand-ink">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
