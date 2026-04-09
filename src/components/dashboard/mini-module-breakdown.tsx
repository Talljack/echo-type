'use client';

import { BookOpen, Headphones, Mic, PenTool } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Props {
  data: Record<string, number>;
}

const MODULE_STYLE: Record<string, { icon: typeof Headphones; color: string; bg: string }> = {
  listen: { icon: Headphones, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  speak: { icon: Mic, color: 'text-green-600', bg: 'bg-green-100' },
  read: { icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-100' },
  write: { icon: PenTool, color: 'text-purple-600', bg: 'bg-purple-100' },
};

export function MiniModuleBreakdown({ data }: Props) {
  const { messages: t } = useI18n('dashboard');
  const total = Object.values(data).reduce((s, n) => s + n, 0);

  const moduleLabels = useMemo<Record<string, string>>(
    () => ({
      listen: t.modules.listen.label,
      speak: t.modules.speak.label,
      read: t.modules.read.label,
      write: t.modules.write.label,
    }),
    [t],
  );

  if (total === 0) {
    return <p className="text-xs text-indigo-400 py-2">{t.miniAnalytics.noSessions}</p>;
  }

  const entries = Object.entries(MODULE_STYLE)
    .map(([key, style]) => ({
      key,
      count: data[key] || 0,
      pct: total > 0 ? Math.round(((data[key] || 0) / total) * 100) : 0,
      label: moduleLabels[key],
      ...style,
    }))
    .filter((e) => e.count > 0);

  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-2.5 bg-slate-100">
        {entries.map((e) => (
          <div key={e.key} className={`${e.bg} transition-all`} style={{ width: `${e.pct}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <span key={e.key} className="flex items-center gap-1 text-xs">
              <Icon className={`w-3 h-3 ${e.color}`} />
              <span className="text-indigo-600">{e.label}</span>
              <span className="font-medium text-indigo-900">{e.count}</span>
              <span className="text-indigo-400">({e.pct}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
