'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, Clock3, MoreHorizontal, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LearningSettings } from '@/components/learning/learning-settings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import {
  applyDailyEvidence,
  reconcileDailyTasks,
  remainingDailyMinutes,
  selectBudgetTasks,
  transitionDailyTask,
} from '@/lib/daily-task-planner';
import { dailyWorkspaceProgress } from '@/lib/daily-workspace-progress';
import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import { buildTextCourseTasks } from '@/lib/text-daily-tasks';
import { buildTodayReviewItems } from '@/lib/today-review';
import { buildVocabularyTasks } from '@/lib/vocabulary';
import { useLanguageStore } from '@/stores/language-store';
import type { DailyTask } from '@/types/daily-task';

const control =
  'min-h-11 rounded-xl px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50';
const allDays = [0, 1, 2, 3, 4, 5, 6];

export function DailyTaskQueue({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const router = useRouter();
  const { data, error, retry } = useLearningWorkspace();
  const zh = useLanguageStore((state) => state.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [clockNow, setNow] = useState(Date.now());
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const database = data?.database;
  const state = useLiveQuery(async () => {
    if (!database) return undefined;
    const [tasks, attempts, pronunciation] = await Promise.all([
      database.dailyTasks.toArray(),
      database.learningAttempts.toArray(),
      database.pronunciationProgress.toArray(),
    ]);
    return { tasks, attempts, pronunciation, observedAt: Date.now() };
  }, [database]);
  // A newly saved attempt must be visible immediately, even between clock ticks.
  const now = Math.max(clockNow, state?.observedAt ?? 0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const dateKey = toLocalDateKey(now);
  const settings = state?.tasks.find((task) => task.id === 'preferences:daily');
  const minutes = settings?.minutes ?? 20;
  const learningDays = settings?.learningDays ?? allDays;

  useEffect(() => {
    if (!database || database !== db || !data || !state) return;
    let cancelled = false;
    const make = (
      kind: DailyTask['kind'],
      sourceId: string,
      title: string,
      reason: string,
      reasonZh: string,
      href: string,
      duration: number,
      extra: Partial<DailyTask> = {},
    ): DailyTask => ({
      id: `${dateKey}:${kind}:${sourceId}`,
      dateKey,
      originDateKey: dateKey,
      kind,
      sourceId,
      title,
      titleZh: title,
      reason,
      reasonZh,
      href,
      minutes: duration,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      ...extra,
    });
    const candidates: DailyTask[] = buildTodayReviewItems(data.records, data.contents, now).map((item) =>
      make('review', item.recordId, item.title, 'Due for spaced review', '间隔复习已到期', item.href, 2, {
        contentIds: [item.contentId],
        module: item.module,
      }),
    );
    for (const item of data.favorites.filter((item) => (item.fsrsCard?.due ?? item.nextReview ?? Infinity) <= now)) {
      candidates.push(
        make(
          'favorite',
          item.id,
          item.text,
          'Recall a saved expression',
          '回忆收藏的表达',
          `/favorites/review?item=${encodeURIComponent(item.id)}`,
          2,
        ),
      );
    }
    const ordered = [...data.lessons].sort((a, b) => {
      const unitA = data.units.find((unit) => unit.id === a.unitId);
      const unitB = data.units.find((unit) => unit.id === b.unitId);
      return Number(unitB?.source === 'imported') - Number(unitA?.source === 'imported') || a.order - b.order;
    });
    candidates.push(
      ...buildVocabularyTasks(
        data.contents,
        data.records,
        state.attempts,
        state.tasks.find((task) => task.id === 'preferences:vocabulary')?.newWordsPerDay ?? 10,
        now,
      ),
    );
    candidates.push(...buildTextCourseTasks(ordered, state.attempts, now));
    const weak = data.weakSpots[0];
    if (weak)
      candidates.push(
        make('weak-spot', weak.id, weak.text, 'Retry a recent difficulty', '重练最近的薄弱项', weak.targetHref, 3, {
          contentIds: [weak.sourceId],
          module: weak.module,
        }),
      );
    else
      candidates.push(
        make(
          'pronunciation',
          'daily-sentence',
          'Practice a sound',
          'Record a sound and listen back',
          '录制一个音标并回听',
          '/pronunciation',
          3,
          { titleZh: '练习一个音标', module: 'speak' },
        ),
      );
    void database
      .transaction('rw', database.dailyTasks, async () => {
        if (database !== db) return;
        const saved = await database.dailyTasks.toArray();
        const credited = applyDailyEvidence(
          saved,
          {
            sessions: data.sessions,
            attempts: state.attempts,
            favorites: data.favorites,
            records: data.records,
            weakSpots: data.weakSpots,
            pronunciation: state.pronunciation,
          },
          now,
        );
        const next = reconcileDailyTasks(credited, candidates, dateKey, now);
        const originals = new Map(saved.map((task) => [task.id, JSON.stringify(task)]));
        const changed = next.filter((task) => originals.get(task.id) !== JSON.stringify(task));
        if (database !== db) throw new Error('Account changed. Reopen your daily queue.');
        if (changed.length) await database.dailyTasks.bulkPut(changed);
      })
      .catch((cause) => {
        if (!cancelled && database === db)
          setFailure(cause instanceof Error ? cause.message : 'Could not save daily queue.');
      });
    return () => {
      cancelled = true;
    };
  }, [database, data, state, dateKey, now]);

  async function changeSettings(patch: Partial<DailyTask>) {
    const active = database;
    if (!active || active !== db) return;
    setBusy(true);
    setFailure('');
    try {
      await active.transaction('rw', active.dailyTasks, async () => {
        const current = await active.dailyTasks.get('preferences:daily');
        if (active !== db) throw new Error('Account changed. Try again.');
        const time = Date.now();
        await active.dailyTasks.put({
          id: 'preferences:daily',
          kind: 'settings',
          sourceId: 'daily',
          dateKey,
          originDateKey: dateKey,
          title: 'Daily preferences',
          titleZh: '每日偏好',
          reason: '',
          reasonZh: '',
          href: '/dashboard',
          minutes: 20,
          status: 'pending',
          createdAt: time,
          learningDays: allDays,
          ...current,
          ...patch,
          updatedAt: time,
        });
      });
    } catch (cause) {
      if (active === db) setFailure(cause instanceof Error ? cause.message : 'Could not save.');
    } finally {
      if (active === db) setBusy(false);
    }
  }
  async function act(task: DailyTask, action: 'start' | 'pause' | 'defer' | 'skip' | 'restore') {
    const active = database;
    if (!active || active !== db) return;
    setBusy(true);
    setFailure('');
    try {
      const updated = await active.transaction('rw', active.dailyTasks, async () => {
        const current = await active.dailyTasks.get(task.id);
        if (!current || active !== db) throw new Error('Task unavailable. Reopen your queue.');
        const allocated = action === 'start' && !current.startedAt ? { ...current, minutes: task.minutes } : current;
        const next = transitionDailyTask(allocated, action, Date.now());
        await active.dailyTasks.put(next);
        return next;
      });
      if (active !== db) return;
      if (action === 'start' && updated.status === 'in-progress') {
        if (!updated.href.startsWith('/') || updated.href.startsWith('//') || updated.href.includes('\\'))
          throw new Error('Invalid practice destination.');
        router.push(updated.href);
      }
    } catch (cause) {
      if (active === db) setFailure(cause instanceof Error ? cause.message : 'Could not save.');
    } finally {
      if (active === db) setBusy(false);
    }
  }

  if (error)
    return (
      <div role="alert">
        {error}
        <button className={control} type="button" onClick={retry}>
          {t('Retry', '重试')}
        </button>
      </div>
    );
  if (!data || !state) return <output>{t('Preparing your daily queue…', '正在准备每日任务…')}</output>;
  const eligible = state.tasks.filter(
    (task) =>
      !task.superseded &&
      task.kind !== 'settings' &&
      (!reviewOnly || task.stage === 'recall' || ['review', 'favorite', 'weak-spot'].includes(task.kind)),
  );
  const active = eligible.filter(
    (task) => task.dateKey === dateKey && ['pending', 'paused', 'in-progress'].includes(task.status),
  );
  const isLearningDay = learningDays.includes(new Date(now).getDay());
  const remaining = remainingDailyMinutes(state.tasks, dateKey, minutes);
  const visible = isLearningDay ? selectBudgetTasks(active, remaining, now) : [];
  const history = eligible.filter(
    (task) =>
      task.status === 'deferred' ||
      (task.status === 'skipped' && task.dateKey <= dateKey) ||
      (task.status === 'completed' && task.dateKey === dateKey),
  );
  const progress = dailyWorkspaceProgress(data.sessions, data.contents);
  const statusLabel = (status: DailyTask['status']) =>
    ({
      pending: t('Ready', '待开始'),
      'in-progress': t('In progress', '进行中'),
      paused: t('Paused', '已暂停'),
      completed: t('Completed', '已完成'),
      skipped: t('Skipped', '已跳过'),
      deferred: t('Deferred', '已推迟'),
    })[status];
  const practiceLabel = (task: DailyTask) => {
    if (task.vocabularyMode) return t('Vocabulary', '词汇');
    if (task.kind === 'favorite') return t('Saved phrases', '收藏表达');
    if (task.kind === 'weak-spot') return t('Weak spots', '薄弱项');
    if (task.kind === 'pronunciation') return t('Pronunciation', '发音');
    if (!task.module) return t('Review', '复习');
    return {
      listen: t('Listening', '听力'),
      read: t('Reading', '阅读'),
      speak: t('Speaking', '口语'),
      write: t('Writing', '写作'),
    }[task.module];
  };
  const focusLabels = [...new Set(visible.map(practiceLabel))];
  const queue = showAll ? visible : visible.slice(0, 4);
  const firstTask =
    visible.find((task) => task.status === 'in-progress') ??
    visible.find((task) => task.status === 'paused') ??
    visible[0];
  return (
    <section
      data-testid="daily-task-queue"
      className="min-w-0 overflow-hidden rounded-3xl bg-white text-slate-800 shadow-sm"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-[var(--font-poppins)] text-2xl font-semibold text-indigo-950">
              {reviewOnly ? t('Your review plan', '今日复习计划') : t('Today', '今天')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {visible.length} {t('activities', '项练习')} · {remaining} {t('min left', '分钟剩余')}
            </p>
            {focusLabels.length > 0 && (
              <p className="mt-1 truncate text-xs font-medium text-indigo-600">{focusLabels.join(' · ')}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={t('Change practice time', '调整练习时间')}
              aria-expanded={timePickerOpen}
              disabled={busy}
              onClick={() => setTimePickerOpen((open) => !open)}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
            >
              <span data-testid="daily-budget">{minutes}</span> min <ChevronDown className="h-4 w-4" />
            </button>
            {timePickerOpen && (
              <div
                role="group"
                aria-label={t('Daily time budget', '每日时间预算')}
                className="absolute right-0 z-10 mt-2 flex w-52 flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
              >
                {[5, 10, 20, 30, 45].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busy}
                    aria-pressed={minutes === value}
                    onClick={() => {
                      setTimePickerOpen(false);
                      void changeSettings({ minutes: value });
                    }}
                    className={`${control} ${minutes === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {value} min
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {failure && (
          <p role="alert" className="text-sm text-red-700">
            {failure}
          </p>
        )}
        {!visible.length && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p>
              {isLearningDay
                ? t(
                    'No tasks ready in this queue. You can still open your courses.',
                    '此队列暂无待开始任务，仍可打开课程学习。',
                  )
                : t('A rest day. Your unfinished work is retained.', '今天是休息日，未完成任务已保留。')}
            </p>
            {!isLearningDay && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void changeSettings({ learningDays: [...new Set([...learningDays, new Date(now).getDay()])].sort() })
                }
                className="mt-3 min-h-11 font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
              >
                {t('Practice today anyway', '今天也要练习')}
              </button>
            )}
          </div>
        )}
        {firstTask && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(firstTask, 'start')}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            {firstTask.status === 'pending'
              ? t('Start today’s practice', '开始今天的练习')
              : t('Continue today’s practice', '继续今天的练习')}
          </button>
        )}
        {queue.length > 0 && (
          <h3 className="pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t('Up next', '接下来')}
          </h3>
        )}
        <ol className="divide-y divide-slate-100">
          {queue.map((task) => (
            <li key={task.id} data-testid="daily-task-row" className="flex items-center gap-3 py-2.5">
              <Clock3 className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{zh ? task.titleZh : task.title}</p>
                  <span className="shrink-0 text-xs text-slate-500">{task.minutes} min</span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {practiceLabel(task)} · {zh ? task.reasonZh : task.reason}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${t('More options for', '更多操作：')} ${zh ? task.titleZh : task.title}`}
                    disabled={busy}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void act(task, 'start')}>
                    {task.status === 'pending' ? t('Start', '开始') : t('Continue', '继续')}
                  </DropdownMenuItem>
                  {task.status === 'in-progress' && (
                    <DropdownMenuItem onClick={() => void act(task, 'pause')}>{t('Pause', '暂停')}</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => void act(task, 'defer')}>{t('Tomorrow', '明天')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void act(task, 'skip')}>{t('Skip', '跳过')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ol>
        {visible.length > queue.length && (
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-indigo-700 hover:text-indigo-900"
            onClick={() => setShowAll(true)}
          >
            {t(`View ${visible.length - queue.length} more`, `查看另外 ${visible.length - queue.length} 项`)}
          </button>
        )}
        {!!history.length && (
          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold">{t('Saved task status', '已保存的任务状态')}</h3>
            {history.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="break-words">{zh ? task.titleZh : task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span>{statusLabel(task.status)}</span> · {task.dateKey}
                  </p>
                </div>
                {task.status === 'skipped' && (
                  <button
                    type="button"
                    disabled={busy}
                    className={`${control} text-indigo-700`}
                    onClick={() => void act(task, 'restore')}
                  >
                    {t('Restore', '恢复')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <Link href="/learn" className="ml-4 inline-flex min-h-11 items-center text-sm font-medium text-indigo-700">
          {t('All courses', '全部课程')}
        </Link>
        <p className="text-xs leading-5 text-slate-500">
          {t(
            'Times are estimates for a short practice block. Opening a task never marks it complete.',
            '时间为短练习的估算。仅打开任务不会标记完成。',
          )}
        </p>
      </div>
      {!reviewOnly && <LearningSettings practices={progress.practices} words={progress.words} />}
    </section>
  );
}
