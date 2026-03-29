'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/stores/language-store';
import { useI18n } from './use-i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const initialized = useLanguageStore((state) => state.initialized);
  const initialize = useLanguageStore((state) => state.initialize);
  const { interfaceLanguage, messages } = useI18n('common');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) return;
    document.documentElement.lang = interfaceLanguage;
  }, [initialized, interfaceLanguage]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-6 text-center text-sm text-slate-500">
        {messages.appShell.loading}
      </div>
    );
  }

  return <>{children}</>;
}
