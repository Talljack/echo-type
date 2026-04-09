'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#EEF2FF] font-sans antialiased">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-5 max-w-md text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[#312E81]">Something went wrong</h1>
              <p className="text-sm text-[#818CF8] leading-relaxed">
                {error.message || 'An unexpected error occurred. Please try again.'}
              </p>
              {error.digest && <p className="text-xs text-slate-400 font-mono">Error ID: {error.digest}</p>}
            </div>
            <button
              onClick={reset}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#4F46E5]/20 text-[#4F46E5] text-sm font-medium hover:bg-[#4F46E5]/5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
