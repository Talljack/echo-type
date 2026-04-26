import type { CEFRLevel } from '@/stores/assessment-store';
import type { Module } from '@/types/content';

export type LearningGoal = 'speaking' | 'exam' | 'travel' | 'work' | 'balanced';

interface LearningGoalConfig {
  label: string;
  shortLabel: string;
  description: string;
  moduleBonus: Record<Module, number>;
}

export const LEARNING_GOAL_CONFIG: Record<LearningGoal, LearningGoalConfig> = {
  speaking: {
    label: 'Speaking First',
    shortLabel: 'Speaking',
    description: 'Prioritize daily conversation and spoken confidence.',
    moduleBonus: { listen: 4, speak: 12, read: 2, write: 1 },
  },
  exam: {
    label: 'Exam Prep',
    shortLabel: 'Exam',
    description: 'Lean into reading, writing, and accuracy-heavy practice.',
    moduleBonus: { listen: 4, speak: 1, read: 10, write: 10 },
  },
  travel: {
    label: 'Travel English',
    shortLabel: 'Travel',
    description: 'Focus on practical listening and real-world speaking.',
    moduleBonus: { listen: 10, speak: 12, read: 2, write: 1 },
  },
  work: {
    label: 'Work English',
    shortLabel: 'Work',
    description: 'Improve meetings, presentations, and professional writing.',
    moduleBonus: { listen: 4, speak: 9, read: 5, write: 10 },
  },
  balanced: {
    label: 'Balanced Growth',
    shortLabel: 'Balanced',
    description: 'Keep listening, speaking, reading, and writing in rotation.',
    moduleBonus: { listen: 4, speak: 4, read: 4, write: 4 },
  },
};

export function getGoalModuleBonus(goal: LearningGoal | null | undefined, module: Module): number {
  if (!goal) return 0;
  return LEARNING_GOAL_CONFIG[goal].moduleBonus[module];
}

export function buildDailyPlanGoalExplanation(goal: LearningGoal | null | undefined, level?: CEFRLevel | null) {
  if (goal && level) {
    return `${LEARNING_GOAL_CONFIG[goal].label} is active, so today's plan leans toward that goal while staying near ${level}.`;
  }
  if (goal) {
    return `${LEARNING_GOAL_CONFIG[goal].label} is active, so today's plan leans toward that goal.`;
  }
  if (level) {
    return `Your current level is ${level}, so today's content stays near that difficulty.`;
  }
  return 'Your plan balances current weak spots and recent practice.';
}
