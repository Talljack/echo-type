'use client';

import { AlertTriangle, PenTool, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WriteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-purple-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-indigo-900">Writing practice error</h2>
          <p className="text-sm text-indigo-500">{error.message || 'Something went wrong loading this content.'}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" className="cursor-pointer border-indigo-200 text-indigo-600">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Link href="/library">
            <Button variant="outline" className="cursor-pointer border-indigo-200 text-indigo-600">
              <PenTool className="w-4 h-4 mr-2" />
              Pick Content
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
