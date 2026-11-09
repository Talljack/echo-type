'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, AudioLines, Heart, MoreHorizontal, Play, RotateCcw, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LearningSettings } from '@/components/learning/learning-settings';
import { SkillTile } from '@/components/shared/skill';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { saveDailyPreferences } from '@/lib/daily-preferences';
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
  'min-h-10 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';

function TaskIcon({ task }: { task: DailyTask }) {
  if (task.vocabularyMode) return <SkillTile skill="read" size="md" />;
  if (task.module && !['favorite', 'weak-spot', 'pronunciation'].includes(task.kind))
    return <SkillTile skill={task.module} size="md" />;
  const Icon =
    task.kind === 'favorite'
      ? Heart
      : task.kind === 'weak-spot'
        ? Target
        : task.kind === 'pronunciation'
          ? AudioLines
          : RotateCcw;
  const tone =
    task.kind === 'favorite'
      ? 'bg-danger-soft text-danger-ink'
      : task.kind === 'weak-spot'
        ? 'bg-warning-soft text-warning-ink'
        : task.kind === 'pronunciation'
          ? 'bg-speak-soft text-speak-ink'
          : 'bg-brand-soft text-brand-ink';
  return (
    <span aria-hidden="true" className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
      <Icon className="size-4" />
    </span>
  );
}
const allDays = [0, 1, 2, 3, 4, 5, 6];

export function DailyTaskQueue({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const router = useRouter();
  const { data, error, retry } = useLearningWorkspace();
  const zh = useLanguageStore((state) => state.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [clockNow, setNow] = useState(Date.now());
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
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
      await saveDailyPreferences(active, patch);
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
  const doneToday = history.filter((task) => task.status === 'completed').length;
  const totalToday = doneToday + visible.length;
  const pct = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;
  return (
    <section data-testid="daily-task-queue" className="card-paper min-w-0 overflow-hidden text-ink">
      <div className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{reviewOnly ? t('Spaced review', '间隔复习') : t('Daily plan', '每日计划')}</p>
            <h2 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink">
              {reviewOnly ? t('Your review plan', '今日复习计划') : t('Today', '今天')}
            </h2>
            <p className="mt-1 text-sm text-ink-3">
              {visible.length} {t('activities', '项练习')} · {remaining} {t('min left', '分钟剩余')}
              {focusLabels.length > 0 && <span className="text-ink-4"> · {focusLabels.join(' · ')}</span>}
            </p>
          </div>
          <Link
            href="/settings#practice-time"
            aria-label={t('Daily practice time', '每日练习时长')}
            className="relative flex size-16 shrink-0 flex-col items-center justify-center rounded-full text-ink transition-transform hover:scale-[1.03]"
            style={{
              background: `conic-gradient(var(--brand) ${pct * 3.6}deg, var(--surface-3) 0deg)`,
            }}
          >
            <span className="absolute inset-[5px] rounded-full bg-surface" aria-hidden="true" />
            <span className="relative font-display text-lg font-semibold leading-none" data-testid="daily-budget">
              {minutes}
            </span>
            <span className="relative text-[10px] font-semibold text-ink-3">{t('min', '分钟')}</span>
          </Link>
        </div>
        {failure && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {failure}
          </p>
        )}
        {!visible.length && (
          <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden="true" />
            <div>
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
                    void changeSettings({
                      learningDays: [...new Set([...learningDays, new Date(now).getDay()])].sort(),
                    })
                  }
                  className="mt-2 min-h-10 font-semibold text-brand-ink hover:underline disabled:opacity-50"
                >
                  {t('Practice today anyway', '今天也要练习')}
                </button>
              )}
            </div>
          </div>
        )}
        {firstTask && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(firstTask, 'start')}
            className="group flex w-full items-center gap-4 rounded-2xl bg-brand p-4 text-left text-on-brand shadow-sm transition-colors hover:bg-brand-strong focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface/15">
              <Play className="size-5 fill-current" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                {firstTask.status === 'pending'
                  ? t('Start today’s practice', '开始今天的练习')
                  : t('Continue today’s practice', '继续今天的练习')}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-white/75">
                {t('First up:', '第一项：')} {zh ? firstTask.titleZh : firstTask.title} · {firstTask.minutes}{' '}
                {t('min', '分钟')}
              </span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        )}
        {queue.length > 0 && <h3 className="eyebrow pt-1">{t('Up next', '接下来')}</h3>}
        <ol className="-mx-2 space-y-0.5">
          {queue.map((task) => (
            <li
              key={task.id}
              data-testid="daily-task-row"
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
            >
              <TaskIcon task={task} />
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(task, 'start')}
                className="min-w-0 flex-1 text-left disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{zh ? task.titleZh : task.title}</span>
                  {task.status !== 'pending' && (
                    <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-px text-[10px] font-semibold text-warning-ink">
                      {statusLabel(task.status)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-3">
                  {practiceLabel(task)} · {zh ? task.reasonZh : task.reason}
                </span>
              </button>
              <span className="shrink-0 text-xs font-medium tabular-nums text-ink-4">
                {task.minutes} {t('min', '分钟')}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${t('More options for', '更多操作：')} ${zh ? task.titleZh : task.title}`}
                    disabled={busy}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                  >
                    <MoreHorizontal className="size-4" />
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {visible.length > queue.length && (
            <button
              type="button"
              className="min-h-10 text-sm font-semibold text-brand-ink hover:underline"
              onClick={() => setShowAll(true)}
            >
              {t(`View ${visible.length - queue.length} more`, `查看另外 ${visible.length - queue.length} 项`)}
            </button>
          )}
          <Link
            href="/learn"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-ink hover:underline"
          >
            {t('All courses', '全部课程')}
          </Link>
        </div>
        {!!history.length && (
          <details open className="group rounded-xl bg-surface-2 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-2">
              {t('Saved task status', '已保存的任务状态')}
              <span className="text-xs font-medium text-ink-4">
                {doneToday} {t('done today', '今日完成')} · {history.length}
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              {history.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="break-words text-ink">{zh ? task.titleZh : task.title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      <span>{statusLabel(task.status)}</span> · {task.dateKey}
                    </p>
                  </div>
                  {task.status === 'skipped' && (
                    <button
                      type="button"
                      disabled={busy}
                      className={`${control} text-brand-ink hover:bg-surface-3`}
                      onClick={() => void act(task, 'restore')}
                    >
                      {t('Restore', '恢复')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
        <p className="text-xs leading-5 text-ink-4">
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
