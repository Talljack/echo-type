'use client';

import { useLiveQuery } from 'dexie-react-hooks';
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
import { db } from '@/lib/db';
import { useI18n } from '@/lib/i18n/use-i18n';
import { buildDailyPlanGoalExplanation } from '@/lib/learning-goals';
import { detectIOSNativeHost } from '@/lib/tauri';
import { useAssessmentStore } from '@/stores/assessment-store';
import { todayKey, useDailyPlanStore } from '@/stores/daily-plan-store';
import { useLearningGoalStore } from '@/stores/learning-goal-store';
import type { TypingSession } from '@/types/content';

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

interface TaskSessionSummary {
  sessionId: string;
  accuracy: number;
  wpm: number;
  practicedAt: number;
}

function timeAgo(ts: number, messages: ReturnType<typeof useI18n<'common'>>['messages']): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return messages.timeAgo.justNow;
  if (mins < 60) return messages.timeAgo.minutesAgo.replace('{{count}}', String(mins));
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return messages.timeAgo.hoursAgo.replace('{{count}}', String(hrs));
  return messages.timeAgo.daysAgo.replace('{{count}}', String(Math.floor(hrs / 24)));
}

function findLatestMatchingSession(
  task: { module: string; contentId?: string; bookId?: string },
  sessions: TypingSession[],
) {
  const matching = sessions
    .filter((session) => {
      if (!session.completed) return false;
      if (session.module !== task.module) return false;
      if (task.contentId) return session.contentId === task.contentId;
      return true;
    })
    .sort((left, right) => (right.endTime ?? right.startTime) - (left.endTime ?? left.startTime));

  return matching[0];
}

export function TodayPlan() {
  const { messages } = useI18n('dashboard');
  const { messages: common } = useI18n('common');
  const { tasks, dateKey, dataSignature, levelKey, goal, skipTask, setTasks, updateStreak, hydrate } =
    useDailyPlanStore();
  const currentLevel = useAssessmentStore((state) => state.currentLevel);
  const currentGoal = useLearningGoalStore((state) => state.currentGoal);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [taskSessions, setTaskSessions] = useState<Record<string, TaskSessionSummary>>({});
  const isIOSNativeHost = detectIOSNativeHost();
  const activitySignature = useLiveQuery(async () => {
    const [latestSession, latestRecord] = await Promise.all([
      db.sessions.orderBy('startTime').last(),
      db.records.orderBy('lastPracticed').last(),
    ]);

    return `${latestSession?.id ?? 'none'}:${latestSession?.endTime ?? latestSession?.startTime ?? 0}:${
      latestRecord?.id ?? 'none'
    }:${latestRecord?.lastPracticed ?? 0}`;
  }, []);

  useEffect(() => {
    hydrate();
    useLearningGoalStore.getState().hydrate();
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
        const plan = await generateDailyPlan(goalOverride, { currentLevel, learningGoal: currentGoal });
        const syncedPlan = await syncPlanTasksWithActivity(plan);
        const signature = signatureOverride ?? (await getDailyPlanSignature());
        setTasks(syncedPlan, signature, currentLevel ?? '');
      } finally {
        setLoading(false);
      }
    },
    [currentGoal, currentLevel, setTasks],
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
  }, [activitySignature, hydrated, refreshPlan]);

  useEffect(() => {
    if (!hydrated || tasks.length === 0) return;

    let cancelled = false;

    async function loadTaskSessions() {
      const sessions = await db.sessions.toArray();
      if (cancelled) return;

      const next: Record<string, TaskSessionSummary> = {};
      for (const task of tasks) {
        if (!task.completed) continue;
        const latest = findLatestMatchingSession(task, sessions);
        if (!latest) continue;
        next[task.id] = {
          sessionId: latest.id,
          accuracy: latest.accuracy,
          wpm: latest.wpm,
          practicedAt: latest.endTime ?? latest.startTime,
        };
      }
      setTaskSessions(next);
    }

    void loadTaskSessions();

    return () => {
      cancelled = true;
    };
  }, [hydrated, tasks]);

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

  const todayPlanMessages = messages.todayPlan as typeof messages.todayPlan & {
    reopen?: string;
    lastPracticed?: string;
    accuracy?: string;
    wpm?: string;
  };

  if (!hydrated) return null;

  const activeTasks = tasks.filter((task) => !task.skipped);
  const doneCount = activeTasks.filter((task) => task.completed).length;
  const totalCount = activeTasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const planExplanation = `${buildDailyPlanGoalExplanation(currentGoal, currentLevel)} ${
    currentLevel
      ? messages.todayPlan.explanationWithLevel.replace('{{level}}', currentLevel)
      : messages.todayPlan.explanationWithoutLevel
  }`;

  if (loading) {
    return (
      <Card
        className={
          isIOSNativeHost
            ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
            : 'border-slate-100 bg-white shadow-sm'
        }
      >
        <CardContent
          className={
            isIOSNativeHost ? 'p-6 text-center text-sm text-slate-400' : 'p-6 text-center text-sm text-indigo-400'
          }
        >
          {messages.todayPlan.loading}
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card
        className={
          isIOSNativeHost
            ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
            : 'border-slate-100 bg-white shadow-sm'
        }
      >
        <CardContent className="p-6">
          <div className={`mb-3 flex items-center justify-between ${isIOSNativeHost ? 'gap-3' : ''}`}>
            <h2
              className={
                isIOSNativeHost
                  ? 'text-lg font-semibold tracking-[-0.02em] text-slate-950'
                  : 'text-lg font-semibold text-indigo-900'
              }
            >
              {messages.todayPlan.title}
            </h2>
            <StreakBadge />
          </div>
          <p className={isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'text-sm text-indigo-400'}>
            {messages.todayPlan.empty}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={
        isIOSNativeHost
          ? 'rounded-[28px] border border-white/70 bg-white/82 shadow-[0_16px_36px_rgba(15,23,42,0.06)]'
          : 'border-slate-100 bg-white shadow-sm'
      }
    >
      <CardContent className="p-6">
        <div
          className={`mb-4 flex items-start gap-4 ${isIOSNativeHost ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'justify-between'}`}
        >
          <div className="space-y-1">
            <h2
              className={
                isIOSNativeHost
                  ? 'text-lg font-semibold tracking-[-0.02em] text-slate-950'
                  : 'text-lg font-semibold text-indigo-900'
              }
            >
              {messages.todayPlan.title}
            </h2>
            <p
              className={
                isIOSNativeHost
                  ? 'max-w-2xl text-sm leading-6 text-slate-500'
                  : 'max-w-xl text-xs leading-relaxed text-indigo-400'
              }
            >
              {planExplanation}
            </p>
          </div>
          <StreakBadge />
        </div>

        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = moduleIcons[task.module] ?? PenTool;
            const color = moduleColors[task.module] ?? 'bg-indigo-500';
            const taskHref = getTaskHref(task);
            const latestSession = taskSessions[task.id];
            const taskTitle =
              task.type === 'speak'
                ? task.title.replace(/Practice (\d+) scenarios?/, 'Practice $1 scenario lines')
                : task.title;

            if (task.skipped) return null;

            return (
              <div
                key={task.id}
                className={`rounded-2xl p-3.5 transition-colors ${
                  task.completed
                    ? isIOSNativeHost
                      ? 'border border-emerald-100 bg-emerald-50/75'
                      : 'bg-green-50/50'
                    : isIOSNativeHost
                      ? 'border border-slate-100 bg-slate-50/80 hover:bg-slate-50'
                      : 'bg-slate-50 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className={`flex min-w-0 flex-1 gap-3 ${isIOSNativeHost ? 'items-start' : 'items-center'}`}>
                    {task.completed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
                    )}

                    <div
                      className={`flex shrink-0 items-center justify-center ${isIOSNativeHost ? 'h-10 w-10 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]' : 'h-8 w-8 rounded-lg'} ${color}`}
                    >
                      <Icon className={`${isIOSNativeHost ? 'h-5 w-5' : 'h-4 w-4'} text-white`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`${task.completed ? 'text-green-700' : isIOSNativeHost ? 'text-slate-900' : 'text-indigo-900'} ${isIOSNativeHost ? 'text-sm font-semibold leading-6' : 'text-sm font-medium'} ${task.completed ? 'line-through' : ''}`}
                      >
                        {taskTitle}
                      </p>
                      <p
                        className={
                          isIOSNativeHost ? 'text-sm leading-6 text-slate-500' : 'truncate text-xs text-indigo-400'
                        }
                      >
                        {task.description}
                      </p>
                      {task.completed && latestSession && (
                        <div
                          className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${isIOSNativeHost ? 'text-xs text-green-700/90' : 'text-[11px] text-green-700/90'}`}
                        >
                          <span>
                            {(todayPlanMessages.lastPracticed ?? 'Last practiced').replace(
                              '{{time}}',
                              timeAgo(latestSession.practicedAt, common),
                            )}
                          </span>
                          {latestSession.accuracy > 0 && (
                            <span>
                              {(todayPlanMessages.accuracy ?? 'Accuracy {{value}}').replace(
                                '{{value}}',
                                `${latestSession.accuracy}%`,
                              )}
                            </span>
                          )}
                          {latestSession.wpm > 0 && (
                            <span>
                              {(todayPlanMessages.wpm ?? 'WPM {{value}}').replace(
                                '{{value}}',
                                String(latestSession.wpm),
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-1 pl-11 sm:pl-0">
                    {task.completed ? (
                      <Link href={taskHref}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-9 shrink-0 cursor-pointer ${isIOSNativeHost ? 'rounded-full px-4 text-green-700 hover:bg-green-100 hover:text-green-800' : 'text-green-700 hover:bg-green-100 hover:text-green-800'}`}
                        >
                          <Play className="mr-1 h-3.5 w-3.5" />
                          {todayPlanMessages.reopen ?? 'Open'}
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => skipTask(task.id)}
                          className={`cursor-pointer transition-colors ${isIOSNativeHost ? 'rounded-full border border-slate-200 px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600' : 'rounded-md p-1.5 text-indigo-300 hover:bg-indigo-50 hover:text-indigo-500'}`}
                          title={messages.todayPlan.skip}
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                        <Link href={getTaskHref(task)}>
                          <Button
                            size="sm"
                            className={`cursor-pointer bg-indigo-600 hover:bg-indigo-700 ${isIOSNativeHost ? 'h-10 rounded-full px-4 text-sm font-semibold shadow-[0_10px_22px_rgba(79,70,229,0.18)]' : 'h-8 px-3'}`}
                          >
                            <Play className="mr-1 h-3.5 w-3.5" />
                            {messages.todayPlan.start}
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-4 border-t pt-4 ${isIOSNativeHost ? 'border-slate-100' : 'border-slate-100'}`}>
          <div
            className={`mb-2 flex items-center ${isIOSNativeHost ? 'flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between' : 'justify-between'}`}
          >
            <span className={isIOSNativeHost ? 'text-sm text-slate-500' : 'text-xs text-indigo-500'}>
              {messages.todayPlan.completed
                .replace('{{done}}', String(doneCount))
                .replace('{{total}}', String(totalCount))}
            </span>
            <GoalSettingDialog onGoalChanged={generate} />
          </div>
          <div
            className={`h-2 w-full overflow-hidden rounded-full ${isIOSNativeHost ? 'bg-slate-200/80' : 'bg-slate-100'}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${isIOSNativeHost ? 'bg-[linear-gradient(90deg,#4f46e5_0%,#7c3aed_100%)]' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
