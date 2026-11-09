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
  daily: 'bg-info-soft text-info-ink border-info-line',
  work: 'bg-purple-100 text-purple-700 border-purple-200',
  travel: 'bg-orange-100 text-orange-700 border-orange-200',
  social: 'bg-pink-100 text-pink-700 border-pink-200',
  academic: 'bg-info-soft text-info-ink border-info-line',
  custom: 'bg-surface-3 text-ink-2 border-line',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success-soft text-success-ink border-success-line',
  intermediate: 'bg-warning-soft text-warning-ink border-warning-line',
  advanced: 'bg-danger-soft text-danger-ink border-danger-line',
};

interface ScenarioCardProps {
  scenario: Scenario;
  onClick?: (scenario: Scenario) => void;
  isRecommended?: boolean;
}

export function ScenarioCard({ scenario, onClick, isRecommended = false }: ScenarioCardProps) {
  const { messages: t } = useI18n('speak');
  const Icon = iconMap[scenario.icon] || MessageCircle;

  return (
    <Card
      className={cn(
        'group bg-surface hover:bg-brand-soft/50 border-line hover:border-brand-line shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
        isRecommended && 'ring-2 ring-brand-line border-brand-line bg-brand-soft/30',
      )}
      onClick={onClick ? () => onClick(scenario) : undefined}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-tint group-hover:bg-brand-line flex items-center justify-center shrink-0 transition-colors duration-200">
            <Icon className="w-4.5 h-4.5 text-brand-ink" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-ink text-sm leading-tight">{scenario.title}</h3>
              {isRecommended && <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-ink" />}
            </div>
            <p className="text-xs text-ink-3">{scenario.titleZh}</p>
            <p className="text-xs text-ink-4 mt-1 line-clamp-1">{scenario.description}</p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[scenario.category]}`}>
                {scenario.category}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty]}`}>
                {scenario.difficulty}
              </Badge>
              {isRecommended && (
                <Badge className="bg-brand-tint text-brand-ink text-[10px] px-1.5 py-0">
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
