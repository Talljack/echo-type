'use client';

import { Check, Globe } from 'lucide-react';
import { Section } from '@/components/settings/section';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';
import { type InterfaceLanguage, useLanguageStore } from '@/stores/language-store';

export function LanguageSection() {
  const { messages: common } = useI18n('common');
  const { messages: settings } = useI18n('settings');
  const interfaceLanguage = useLanguageStore((state) => state.interfaceLanguage);
  const setInterfaceLanguage = useLanguageStore((state) => state.setInterfaceLanguage);

  const options: Array<{ id: InterfaceLanguage; label: string; native: string }> = [
    {
      id: 'en',
      label: common.languageNames.en,
      native: common.nativeLanguageNames.en,
    },
    {
      id: 'zh',
      label: common.languageNames.zh,
      native: common.nativeLanguageNames.zh,
    },
  ];

  return (
    <Section title={settings.sections.language} icon={Globe}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{settings.language.interfaceLanguage}</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map(({ id, label, native }) => (
              <button
                key={id}
                type="button"
                onClick={() => setInterfaceLanguage(id)}
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                  interfaceLanguage === id
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
                aria-pressed={interfaceLanguage === id}
              >
                <span>{native}</span>
                <span className="text-xs text-slate-400">{label}</span>
                {interfaceLanguage === id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">{settings.language.helper}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">{common.labels.learningTarget}</p>
            <p className="text-xs text-slate-400">{common.descriptions.learningTarget}</p>
          </div>
          <span className="text-sm font-medium text-indigo-600">{common.labels.english}</span>
        </div>
      </div>
    </Section>
  );
}
