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
          <p className="mb-2 text-sm font-medium text-ink-2">{settings.language.interfaceLanguage}</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map(({ id, label, native }) => (
              <button
                key={id}
                type="button"
                id={`settings-language-${id}`}
                onClick={() => setInterfaceLanguage(id)}
                data-testid={`settings-language-${id}`}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-sm font-medium transition-colors',
                  'rounded-lg',
                  interfaceLanguage === id
                    ? 'border-brand-line bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-ink-2 hover:bg-surface-2',
                )}
                aria-label={`${native} ${label}${interfaceLanguage === id ? ', selected' : ''}`}
              >
                <span>{native}</span>
                <span className="text-xs text-ink-4">{label}</span>
                {interfaceLanguage === id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <p className={cn('mt-2 text-xs text-ink-4')}>{settings.language.helper}</p>
        </div>
        <div className={cn('flex items-center justify-between border border-line px-4 py-3', 'rounded-lg')}>
          <div>
            <p className="text-sm font-medium text-ink-2">{common.labels.learningTarget}</p>
            <p className="text-xs text-ink-4">{common.descriptions.learningTarget}</p>
          </div>
          <span className="text-sm font-medium text-brand-ink">{common.labels.english}</span>
        </div>
      </div>
    </Section>
  );
}
