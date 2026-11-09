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
import { useI18n } from '@/lib/i18n/use-i18n';
import type { DailyGoal } from '@/stores/daily-plan-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';

export function GoalSettingDialog({ onGoalChanged }: { onGoalChanged?: (goal: DailyGoal) => void }) {
  const { messages } = useI18n('dashboard');
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
        <Button variant="ghost" size="sm" className="cursor-pointer text-brand-ink hover:text-brand-ink">
          <Settings className="mr-1 h-4 w-4" />
          {messages.goalDialog.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.goalDialog.title}</DialogTitle>
          <DialogDescription>{messages.goalDialog.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <p className="text-sm font-medium text-ink">{messages.goalDialog.newWordsPerDay}</p>
            <div className="mt-2 flex items-center gap-3">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWords(n)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    words === n ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink hover:bg-brand-tint'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">{messages.goalDialog.sessionsPerDay}</p>
            <div className="mt-2 flex items-center gap-3">
              {[2, 3, 4, 5, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessions(n)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    sessions === n ? 'bg-brand text-white' : 'bg-brand-soft text-brand-ink hover:bg-brand-tint'
                  }`}
                >
                  {n === 4 ? messages.goalDialog.balancedLabel.replace('{{count}}', String(n)) : n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-brand-muted">{messages.goalDialog.balancedDescription}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="cursor-pointer bg-brand hover:bg-brand-strong">
            {messages.goalDialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
