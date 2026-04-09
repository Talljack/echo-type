'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';
import { BUILTIN_SCENARIOS } from '@/lib/scenarios';
import type { Scenario, ScenarioCategory } from '@/types/scenario';
import { ScenarioCard } from './scenario-card';

interface ScenarioGridProps {
  scenarios?: Scenario[];
  onSelect?: (scenario: Scenario) => void;
  getHref?: (scenario: Scenario) => string;
  highlightedIds?: string[];
}

export function ScenarioGrid({
  scenarios = BUILTIN_SCENARIOS,
  onSelect,
  getHref,
  highlightedIds = [],
}: ScenarioGridProps) {
  const { messages: t } = useI18n('speak');
  const [activeCategory, setActiveCategory] = useState<ScenarioCategory | 'all'>('all');

  const categories = useMemo<{ value: ScenarioCategory | 'all'; label: string }[]>(
    () => [
      { value: 'all', label: t.scenarios.categories.all },
      { value: 'daily', label: t.scenarios.categories.daily },
      { value: 'work', label: t.scenarios.categories.work },
      { value: 'travel', label: t.scenarios.categories.travel },
      { value: 'social', label: t.scenarios.categories.social },
    ],
    [t],
  );

  const filtered = activeCategory === 'all' ? scenarios : scenarios.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <Badge
            key={cat.value}
            variant="outline"
            className={`cursor-pointer transition-colors duration-150 text-xs px-2.5 py-1 ${
              activeCategory === cat.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((scenario) =>
          getHref ? (
            <Link key={scenario.id} href={getHref(scenario)} prefetch>
              <ScenarioCard scenario={scenario} isRecommended={highlightedIds.includes(scenario.id)} />
            </Link>
          ) : (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onClick={onSelect}
              isRecommended={highlightedIds.includes(scenario.id)}
            />
          ),
        )}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">{t.scenarios.noScenariosInCategory}</div>
      )}
    </div>
  );
}
