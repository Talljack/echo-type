'use client';

import { BarChart3, BookOpen, Target, TrendingUp } from 'lucide-react';
import type { AnalyticsBlock as AnalyticsBlockType } from '@/types/chat';

const ICON_MAP: Record<string, React.ElementType> = {
  sessions: BarChart3,
  accuracy: Target,
  progress: TrendingUp,
  content: BookOpen,
};

interface AnalyticsBlockProps {
  block: AnalyticsBlockType;
}

export function AnalyticsBlockComponent({ block }: AnalyticsBlockProps) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        {block.stats.map((stat, i) => {
          const Icon = (stat.icon && ICON_MAP[stat.icon]) || BarChart3;
          return (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{stat.label}</p>
                <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
                {stat.change && <p className="text-[10px] text-green-600">{stat.change}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
