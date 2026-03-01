'use client';

import { useState } from 'react';
import { ScenarioCard } from './scenario-card';
import { Badge } from '@/components/ui/badge';
import type { Scenario, ScenarioCategory } from '@/types/scenario';

const categories: { value: ScenarioCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'work', label: 'Work' },
  { value: 'travel', label: 'Travel' },
  { value: 'social', label: 'Social' },
];

interface ScenarioGridProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
  highlightedIds?: string[];
}

export function ScenarioGrid({ scenarios, onSelect, highlightedIds = [] }: ScenarioGridProps) {
  const [activeCategory, setActiveCategory] = useState<ScenarioCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? scenarios
    : scenarios.filter((s) => s.category === activeCategory);

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
        {filtered.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onClick={onSelect}
            isRecommended={highlightedIds.includes(scenario.id)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No scenarios in this category yet.
        </div>
      )}
    </div>
  );
}
