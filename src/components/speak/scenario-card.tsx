'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Coffee,
  Hotel,
  MapPin,
  MessageCircle,
  Plane,
  Presentation,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';
import { detectIOSNativeHost } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';

const iconMap: Record<string, LucideIcon> = {
  Coffee,
  ShoppingCart,
  MapPin,
  Hotel,
  UtensilsCrossed,
  Briefcase,
  Stethoscope,
  Users,
  Presentation,
  Plane,
};

const categoryColors: Record<string, string> = {
  daily: 'bg-blue-100 text-blue-700 border-blue-200',
  work: 'bg-purple-100 text-purple-700 border-purple-200',
  travel: 'bg-orange-100 text-orange-700 border-orange-200',
  social: 'bg-pink-100 text-pink-700 border-pink-200',
  academic: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  custom: 'bg-slate-100 text-slate-700 border-slate-200',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

interface ScenarioCardProps {
  scenario: Scenario;
  onClick?: (scenario: Scenario) => void;
  isRecommended?: boolean;
}

export function ScenarioCard({ scenario, onClick, isRecommended = false }: ScenarioCardProps) {
  const { messages: t } = useI18n('speak');
  const Icon = iconMap[scenario.icon] || MessageCircle;
  const isIOSNativeHost = detectIOSNativeHost();

  return (
    <Card
      className={cn(
        isIOSNativeHost
          ? 'group rounded-[26px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.10)] cursor-pointer'
          : 'group bg-white hover:bg-indigo-50/50 border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
        isRecommended &&
          (isIOSNativeHost
            ? 'border-indigo-200 bg-indigo-50/45 ring-1 ring-indigo-200'
            : 'ring-2 ring-indigo-300 border-indigo-200 bg-indigo-50/30'),
      )}
      onClick={onClick ? () => onClick(scenario) : undefined}
    >
      <CardContent className={isIOSNativeHost ? 'p-4.5' : 'p-3.5'}>
        <div className="flex items-start gap-3">
          <div
            className={
              isIOSNativeHost
                ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition-colors duration-200 group-hover:bg-indigo-100'
                : 'w-9 h-9 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors duration-200'
            }
          >
            <Icon className={isIOSNativeHost ? 'h-5 w-5 text-indigo-700' : 'w-4.5 h-4.5 text-indigo-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className={
                  isIOSNativeHost
                    ? 'text-sm font-semibold leading-6 text-slate-900'
                    : 'font-semibold text-indigo-900 text-sm leading-tight'
                }
              >
                {scenario.title}
              </h3>
              {isRecommended && (
                <Sparkles className={`${isIOSNativeHost ? 'h-4 w-4' : 'w-3.5 h-3.5'} shrink-0 text-indigo-500`} />
              )}
            </div>
            <p className={isIOSNativeHost ? 'text-xs font-medium text-slate-500' : 'text-xs text-slate-500'}>
              {scenario.titleZh}
            </p>
            <p
              className={
                isIOSNativeHost
                  ? 'mt-1 line-clamp-2 text-sm leading-6 text-slate-500'
                  : 'text-xs text-slate-400 mt-1 line-clamp-1'
              }
            >
              {scenario.description}
            </p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={`${isIOSNativeHost ? 'rounded-full px-2 py-0.5 text-[10px]' : 'text-[10px] px-1.5 py-0'} ${categoryColors[scenario.category]}`}
              >
                {scenario.category}
              </Badge>
              <Badge
                variant="outline"
                className={`${isIOSNativeHost ? 'rounded-full px-2 py-0.5 text-[10px]' : 'text-[10px] px-1.5 py-0'} ${difficultyColors[scenario.difficulty]}`}
              >
                {scenario.difficulty}
              </Badge>
              {isRecommended && (
                <Badge
                  className={`${isIOSNativeHost ? 'rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-600' : 'bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0'}`}
                >
                  {t.scenarios.recommended}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
