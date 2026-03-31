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
import { useI18n } from '@/lib/i18n/use-i18n';
import { useAssessmentStore } from '@/stores/assessment-store';
import { todayKey, useDailyPlanStore } from '@/stores/daily-plan-store';

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
  const { messages } = useI18n('dashboard');
  const { tasks, dateKey, dataSignature, levelKey, goal, skipTask, setTasks, updateStreak, hydrate } =
    useDailyPlanStore();
  const currentLevel = useAssessmentStore((state) => state.currentLevel);
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

  const completedCount = tasks.filter((task) => task.completed).length;
  useEffect(() => {
    if (completedCount > 0) {
      updateStreak();
    }
  }, [completedCount, updateStreak]);

  if (!hydrated) return null;

  const activeTasks = tasks.filter((task) => !task.skipped);
  const doneCount = activeTasks.filter((task) => task.completed).length;
  const totalCount = activeTasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const planExplanation = currentLevel
    ? messages.todayPlan.explanationWithLevel.replace('{{level}}', currentLevel)
    : messages.todayPlan.explanationWithoutLevel;

  if (loading) {
    return (
      <Card className="border-slate-100 bg-white shadow-sm">
        <CardContent className="p-6 text-center text-sm text-indigo-400">{messages.todayPlan.loading}</CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-slate-100 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-indigo-900">{messages.todayPlan.title}</h2>
            <StreakBadge />
          </div>
          <p className="text-sm text-indigo-400">{messages.todayPlan.empty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-100 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-indigo-900">{messages.todayPlan.title}</h2>
            <p className="max-w-xl text-xs leading-relaxed text-indigo-400">{planExplanation}</p>
          </div>
          <StreakBadge />
        </div>

        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = moduleIcons[task.module] ?? PenTool;
            const color = moduleColors[task.module] ?? 'bg-indigo-500';

            if (task.skipped) return null;

            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                  task.completed ? 'bg-green-50/50' : 'bg-slate-50 hover:bg-indigo-50/50'
                }`}
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-indigo-300" />
                )}

                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${task.completed ? 'text-green-700 line-through' : 'text-indigo-900'}`}
                  >
                    {task.title}
                  </p>
                  <p className="truncate text-xs text-indigo-400">{task.description}</p>
                </div>

                {!task.completed && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => skipTask(task.id)}
                      className="cursor-pointer rounded-md p-1.5 text-indigo-300 transition-colors hover:bg-indigo-50 hover:text-indigo-500"
                      title={messages.todayPlan.skip}
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <Link href={getTaskHref(task)}>
                      <Button size="sm" className="h-8 cursor-pointer bg-indigo-600 px-3 hover:bg-indigo-700">
                        <Play className="mr-1 h-3.5 w-3.5" />
                        {messages.todayPlan.start}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-indigo-500">
              {messages.todayPlan.completed
                .replace('{{done}}', String(doneCount))
                .replace('{{total}}', String(totalCount))}
            </span>
            <GoalSettingDialog onGoalChanged={generate} />
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
