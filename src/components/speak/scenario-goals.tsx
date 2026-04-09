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
  beginner: 'bg-green-100 text-green-700 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

export function ScenarioGoals({ goals, difficulty }: ScenarioGoalsProps) {
  const { messages: t } = useI18n('speak');
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-indigo-50/50 border-indigo-100">
      <CardContent className="p-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-800">{t.scenarios.conversationGoals}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${difficultyClassName[difficulty]}`}>
              {t.scenarios.difficulty[difficulty]}
            </Badge>
          </div>
          <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-indigo-400" />
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
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-600">
                  <span className="text-indigo-300 mt-0.5">•</span>
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
