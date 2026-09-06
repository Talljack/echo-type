'use client';

import { Check, Globe } from 'lucide-react';
import { Section } from '@/components/settings/section';
import { IOS_SUBCARD_CLASS } from '@/components/shared/ios-native-ui';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { type InterfaceLanguage, useLanguageStore } from '@/stores/language-store';

export function LanguageSection() {
  const isIOSNativeHost = detectIOSNativeHost();
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
                id={`settings-language-${id}`}
                onClick={() => setInterfaceLanguage(id)}
                data-testid={`settings-language-${id}`}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-sm font-medium transition-colors',
                  isIOSNativeHost ? 'rounded-[20px]' : 'rounded-lg',
                  interfaceLanguage === id
                    ? isIOSNativeHost
                      ? 'border-indigo-200 bg-indigo-50/85 text-indigo-700 shadow-[0_5px_14px_rgba(79,70,229,0.08)]'
                      : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : isIOSNativeHost
                      ? 'border-slate-200/80 bg-white text-slate-600 hover:border-indigo-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
                aria-label={`${native} ${label}${interfaceLanguage === id ? ', selected' : ''}`}
              >
                <span>{native}</span>
                <span className="text-xs text-slate-400">{label}</span>
                {interfaceLanguage === id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <p className={cn('mt-2 text-xs text-slate-400', isIOSNativeHost && 'px-1 leading-5')}>
            {settings.language.helper}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center justify-between border border-slate-100 px-4 py-3',
            isIOSNativeHost ? IOS_SUBCARD_CLASS : 'rounded-lg',
          )}
        >
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
