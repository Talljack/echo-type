'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface ScenarioGoalsProps {
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const difficultyConfig = {
  beginner: { label: 'Beginner', className: 'bg-green-100 text-green-700 border-green-200' },
  intermediate: { label: 'Intermediate', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  advanced: { label: 'Advanced', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function ScenarioGoals({ goals, difficulty }: ScenarioGoalsProps) {
  const [expanded, setExpanded] = useState(true);
  const config = difficultyConfig[difficulty];

  return (
    <Card className="bg-indigo-50/50 border-indigo-100">
      <CardContent className="p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-800">Conversation Goals</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.className}`}>
              {config.label}
            </Badge>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
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
