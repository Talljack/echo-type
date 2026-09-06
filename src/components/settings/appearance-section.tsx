'use client';

import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Section } from '@/components/settings/section';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { type Theme, useAppearanceStore } from '@/stores/appearance-store';

export function AppearanceSection() {
  const isIOSNativeHost = detectIOSNativeHost();
  const { messages } = useI18n('settings');
  const theme = useAppearanceStore((state) => state.theme);
  const setTheme = useAppearanceStore((state) => state.setTheme);

  const options: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: 'light', label: messages.appearance.light, icon: Sun },
    { id: 'dark', label: messages.appearance.dark, icon: Moon },
    { id: 'system', label: messages.appearance.system, icon: Monitor },
  ];

  const helperText =
    theme === 'system'
      ? messages.appearance.systemHelper
      : messages.appearance.usingMode.replace(
          '{{theme}}',
          theme === 'light' ? messages.appearance.light : messages.appearance.dark,
        );

  return (
    <Section title={messages.sections.appearance} icon={Palette}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">{messages.appearance.theme}</p>
          <div className="grid grid-cols-3 gap-2">
            {options.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                data-testid={`settings-theme-${id}`}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-sm font-medium transition-colors',
                  isIOSNativeHost ? 'rounded-[20px]' : 'rounded-xl',
                  theme === id
                    ? isIOSNativeHost
                      ? 'border-indigo-200 bg-indigo-50/85 text-indigo-700 shadow-[0_5px_14px_rgba(79,70,229,0.08)]'
                      : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : isIOSNativeHost
                      ? 'border-slate-200/80 bg-white text-slate-600 hover:border-indigo-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
                aria-label={`${label}${theme === id ? ', selected' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <p className={cn('mt-2 text-xs text-slate-400', isIOSNativeHost && 'px-1 leading-5')}>{helperText}</p>
        </div>
      </div>
    </Section>
  );
}
