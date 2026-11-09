'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Target } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/use-i18n';

interface ScenarioGoalsProps {
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const difficultyClassName = {
  beginner: 'bg-success-soft text-success-ink border-success-line',
  intermediate: 'bg-warning-soft text-warning-ink border-warning-line',
  advanced: 'bg-danger-soft text-danger-ink border-danger-line',
};

export function ScenarioGoals({ goals, difficulty }: ScenarioGoalsProps) {
  const { messages: t } = useI18n('speak');
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-brand-soft/50 border-line">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-ink" />
            <span className="text-sm font-medium text-brand-ink">{t.scenarios.conversationGoals}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyClassName[difficulty]}`}>
              {t.scenarios.difficulty[difficulty]}
            </Badge>
          </div>
          <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-brand-muted" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-1 overflow-hidden"
            >
              {goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-brand-ink">
                  <span className="text-brand-muted mt-0.5">•</span>
                  {goal}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
