'use client';

import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ImportStep = 1 | 2 | 3 | 4;
export const ImportWorkbench = createContext<{
  active: boolean;
  footer: HTMLElement | null;
  setStep: (step: ImportStep) => void;
} | null>(null);

export function useImportStep(step: ImportStep) {
  const context = useContext(ImportWorkbench);
  const active = context?.active;
  const setStep = context?.setStep;
  useEffect(() => {
    if (active) setStep?.(step);
  }, [active, setStep, step]);
  return !!context;
}

/** Keep each importer's actions in one shared footer without duplicating state or handlers. */
export function ImportActions({ children }: { children: ReactNode }) {
  const context = useContext(ImportWorkbench);
  const content = (
    <div className="flex flex-wrap items-center justify-end gap-2 [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:transition-transform [&_button]:active:scale-95 motion-reduce:[&_button]:transform-none [&_button[data-variant=default]]:bg-indigo-600 [&_button[data-variant=default]]:text-white [&_button[data-variant=default]]:hover:bg-indigo-700">
      {children}
    </div>
  );
  if (!context) return content;
  return context.active && context.footer ? createPortal(content, context.footer) : null;
}
