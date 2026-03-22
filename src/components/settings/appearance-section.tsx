'use client';

import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { Section } from '@/components/settings/section';
import { cn } from '@/lib/utils';
import { type Theme, useAppearanceStore } from '@/stores/appearance-store';

const THEME_OPTIONS: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export function AppearanceSection() {
  const { theme, setTheme, hydrate } = useAppearanceStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Section title="Appearance" icon={Palette}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                  theme === id
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {theme === 'system' ? 'Follows your operating system preference' : `Using ${theme} mode`}
          </p>
        </div>
      </div>
    </Section>
  );
}
