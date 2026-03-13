'use client';

import { BookOpen, CheckCircle2, Circle, Headphones, Mic, PenTool, Play, SkipForward } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { GoalSettingDialog } from '@/components/dashboard/goal-setting-dialog';
import { StreakBadge } from '@/components/dashboard/streak-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateDailyPlan, getDailyPlanSignature } from '@/lib/daily-plan';
import { getTaskHref } from '@/lib/daily-plan-links';
import { syncPlanTasksWithActivity } from '@/lib/daily-plan-progress';
import { CEFR_LABELS, useAssessmentStore } from '@/stores/assessment-store';
import { type PlanTask, todayKey, useDailyPlanStore } from '@/stores/daily-plan-store';

const moduleIcons: Record<string, React.ElementType> = {
  listen: Headphones,
  speak: Mic,
  read: BookOpen,
  write: PenTool,
};

const moduleColors: Record<string, string> = {
  listen: 'bg-indigo-500',
  speak: 'bg-green-500',
  read: 'bg-amber-500',
  write: 'bg-purple-500',
};

export function TodayPlan() {
  const { tasks, dateKey, dataSignature, levelKey, goal, skipTask, setTasks, updateStreak, hydrate } =
    useDailyPlanStore();
  const currentLevel = useAssessmentStore((s) => s.currentLevel);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  const syncCompletedTasks = useCallback(async () => {
    if (tasks.length === 0) return;
    const syncedTasks = await syncPlanTasksWithActivity(tasks);
    const changed = syncedTasks.some((task, index) => task.completed !== tasks[index]?.completed);
    if (changed) {
      setTasks(syncedTasks);
    }
  }, [tasks, setTasks]);

  const generate = useCallback(
    async (goalOverride = useDailyPlanStore.getState().goal, signatureOverride?: string) => {
      setLoading(true);
      try {
        const plan = await generateDailyPlan(goalOverride, { currentLevel });
        const syncedPlan = await syncPlanTasksWithActivity(plan);
        const signature = signatureOverride ?? (await getDailyPlanSignature());
        setTasks(syncedPlan, signature, currentLevel ?? '');
      } finally {
        setLoading(false);
      }
    },
    [currentLevel, setTasks],
  );

  const refreshPlan = useCallback(async () => {
    const today = todayKey();
    const signature = await getDailyPlanSignature();
    if (dateKey !== today || dataSignature !== signature || levelKey !== (currentLevel ?? '')) {
      await generate(goal, signature);
      return;
    }
    await syncCompletedTasks();
  }, [currentLevel, dataSignature, dateKey, generate, goal, levelKey, syncCompletedTasks]);

  // Auto-generate plan if date changed
  useEffect(() => {
    if (!hydrated) return;
    void refreshPlan();
  }, [hydrated, refreshPlan]);

  useEffect(() => {
    if (!hydrated) return;

    const handleFocus = () => {
      void refreshPlan();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshPlan();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hydrated, refreshPlan]);

  // Update streak when a task is completed
  const completedCount = tasks.filter((t) => t.completed).length;
  useEffect(() => {
    if (completedCount > 0) {
      updateStreak();
    }
  }, [completedCount, updateStreak]);

  if (!hydrated) return null;

  const activeTasks = tasks.filter((t) => !t.skipped);
  const doneCount = activeTasks.filter((t) => t.completed).length;
  const totalCount = activeTasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const planExplanation = currentLevel
    ? `Based on your ${CEFR_LABELS[currentLevel]} level, weak spots, and the skills you haven't practiced this week. Reviews due today appear above in Today's Review.`
    : "Based on your recent practice, weak spots, and the skills you haven't practiced this week. Reviews due today appear above in Today's Review.";

  if (loading) {
    return (
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6 text-center text-indigo-400 text-sm">Generating today&apos;s plan...</CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-indigo-900">Today&apos;s Plan</h2>
            <StreakBadge />
          </div>
          <p className="text-sm text-indigo-400">
            Import a word book or some content to get personalized learning tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-100 shadow-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-indigo-900">Today&apos;s Plan</h2>
            <p className="text-xs leading-relaxed text-indigo-400 max-w-xl">{planExplanation}</p>
          </div>
          <StreakBadge />
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = moduleIcons[task.module] ?? PenTool;
            const color = moduleColors[task.module] ?? 'bg-indigo-500';

            if (task.skipped) return null;

            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  task.completed ? 'bg-green-50/50' : 'bg-slate-50 hover:bg-indigo-50/50'
                }`}
              >
                {/* Status icon */}
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-indigo-300 shrink-0" />
                )}

                {/* Module icon */}
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${task.completed ? 'text-green-700 line-through' : 'text-indigo-900'}`}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-indigo-400 truncate">{task.description}</p>
                </div>

                {/* Actions */}
                {!task.completed && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => skipTask(task.id)}
                      className="p-1.5 rounded-md text-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Skip"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                    <Link href={getTaskHref(task)}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer h-8 px-3">
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Start
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar + footer */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-indigo-500">
              {doneCount}/{totalCount} completed
            </span>
            <GoalSettingDialog onGoalChanged={generate} />
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
