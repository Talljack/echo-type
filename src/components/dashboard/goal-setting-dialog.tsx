'use client';

import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { DailyGoal } from '@/stores/daily-plan-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';

export function GoalSettingDialog({ onGoalChanged }: { onGoalChanged?: (goal: DailyGoal) => void }) {
  const { goal, setGoal } = useDailyPlanStore();
  const [words, setWords] = useState(goal.wordsPerDay);
  const [sessions, setSessions] = useState(goal.sessionsPerDay);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setWords(goal.wordsPerDay);
      setSessions(goal.sessionsPerDay);
    }
  }, [goal.wordsPerDay, goal.sessionsPerDay, open]);

  function handleSave() {
    const nextGoal = { wordsPerDay: words, sessionsPerDay: sessions };
    setGoal(nextGoal);
    setOpen(false);
    onGoalChanged?.(nextGoal);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-indigo-500 hover:text-indigo-700 cursor-pointer">
          <Settings className="w-4 h-4 mr-1" />
          Set Goals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Learning Goals</DialogTitle>
          <DialogDescription>Set your daily targets. The plan will regenerate based on these goals.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <p className="text-sm font-medium text-indigo-900">New words per day</p>
            <div className="flex items-center gap-3 mt-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setWords(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    words === n ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-indigo-900">Sessions per day</p>
            <div className="flex items-center gap-3 mt-2">
              {[2, 3, 4, 5, 8].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setSessions(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    sessions === n ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {n === 4 ? `${n} Balanced` : n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-indigo-400">
              4 Balanced is the default for steady listen, speak, read, and write coverage.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            Save Goals
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
