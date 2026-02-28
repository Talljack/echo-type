'use client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type OllamaStatus = 'idle' | 'preloading' | 'ready' | 'generating' | 'error';

interface OllamaStatusIndicatorProps {
  status: OllamaStatus;
  isFirstUse?: boolean;
}

export function OllamaStatusIndicator({ status, isFirstUse = false }: OllamaStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-md text-xs">
      {status === 'preloading' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
          <span className="text-slate-700">
            {isFirstUse ? 'Loading model (1-3 min)...' : 'Loading model...'}
          </span>
        </>
      )}
      {status === 'ready' && (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span className="text-slate-700">Model ready</span>
        </>
      )}
      {status === 'generating' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
          <span className="text-slate-700">Generating...</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span className="text-red-700">Model failed</span>
        </>
      )}
    </div>
  );
}
