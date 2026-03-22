'use client';

import { Check, Globe } from 'lucide-react';
import { useEffect } from 'react';
import { Section } from '@/components/settings/section';
import { cn } from '@/lib/utils';
import { type InterfaceLanguage, useLanguageStore } from '@/stores/language-store';

const LANGUAGE_OPTIONS: { id: InterfaceLanguage; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'zh', label: 'Chinese', native: '中文' },
];

export function LanguageSection() {
  const { interfaceLanguage, setInterfaceLanguage, hydrate } = useLanguageStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Section title="Language" icon={Globe}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Interface Language</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGE_OPTIONS.map(({ id, native }) => (
              <button
                key={id}
                type="button"
                onClick={() => setInterfaceLanguage(id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                  interfaceLanguage === id
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <span>{native}</span>
                {interfaceLanguage === id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Learning Target</p>
            <p className="text-xs text-slate-400">The language you are learning</p>
          </div>
          <span className="text-sm font-medium text-indigo-600">English</span>
        </div>
      </div>
    </Section>
  );
}
