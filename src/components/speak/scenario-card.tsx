'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/types/scenario';
import {
  Coffee, ShoppingCart, MapPin, Hotel, UtensilsCrossed,
  Briefcase, Stethoscope, Users, Presentation, Plane,
  MessageCircle, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Coffee, ShoppingCart, MapPin, Hotel, UtensilsCrossed,
  Briefcase, Stethoscope, Users, Presentation, Plane,
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
  onClick: (scenario: Scenario) => void;
  isRecommended?: boolean;
}

export function ScenarioCard({ scenario, onClick, isRecommended = false }: ScenarioCardProps) {
  const Icon = iconMap[scenario.icon] || MessageCircle;

  return (
    <Card
      className={cn(
        'group bg-white hover:bg-indigo-50/50 border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
        isRecommended && 'ring-2 ring-indigo-300 border-indigo-200 bg-indigo-50/30',
      )}
      onClick={() => onClick(scenario)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors duration-200">
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-indigo-900 text-sm leading-tight">{scenario.title}</h3>
              {isRecommended && (
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{scenario.titleZh}</p>
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{scenario.description}</p>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[scenario.category]}`}>
                {scenario.category}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyColors[scenario.difficulty]}`}>
                {scenario.difficulty}
              </Badge>
              {isRecommended && (
                <Badge className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0">
                  Recommended
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
