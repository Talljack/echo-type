'use client';

import { ArrowRight, BookOpen, CheckCircle2, Clock, Headphones, RotateCcw, Target } from 'lucide-react';
import Link from 'next/link';
import { LearningSettings } from '@/components/learning/learning-settings';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { dailyWorkspaceProgress } from '@/lib/daily-workspace-progress';
import { getGoalModuleBonus } from '@/lib/learning-goals';
import { lessonProgress } from '@/lib/learning-units';
import { buildTodayReviewItems } from '@/lib/today-review';
import { useLanguageStore } from '@/stores/language-store';
import { useLearningGoalStore } from '@/stores/learning-goal-store';

export function TodayWorkspace() {
  const { data, error, retry } = useLearningWorkspace();
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const focus = useLearningGoalStore((s) => s.currentGoal);
  const t = (en: string, cn: string) => (zh ? cn : en);
  if (error)
    return (
      <div role="alert" className="rounded-2xl bg-amber-50 p-5">
        {t('Could not prepare your courses. Your original materials are safe.', '暂时无法准备课程，原始材料仍然保留。')}
        <button type="button" onClick={retry} className="ml-3 underline">
          {t('Retry', '重试')}
        </button>
      </div>
    );
  if (!data)
    return (
      <div role="status" className="rounded-3xl bg-white p-8 text-slate-600">
        {t('Preparing your learning path…', '正在准备学习路径…')}
      </div>
    );
  const latest = [...data.sessions]
    .filter((s) => s.completed)
    .sort((a, b) => (b.endTime ?? b.startTime) - (a.endTime ?? a.startTime))[0];
  const ordered = [...data.units].sort((a, b) => {
    const resumed = (id: string) =>
      data.lessons.some((l) => l.unitId === id && l.exercises.some((e) => e.id === latest?.contentId));
    return (
      Number(resumed(b.id)) - Number(resumed(a.id)) ||
      Number(b.source === 'imported') - Number(a.source === 'imported') ||
      b.updatedAt - a.updatedAt
    );
  });
  const unit =
    ordered.find((u) => data.lessons.some((l) => l.unitId === u.id && lessonProgress(l, data.sessions).next)) ??
    ordered[0];
  const lesson = unit
    ? data.lessons
        .filter((l) => l.unitId === unit.id)
        .sort((a, b) => a.order - b.order)
        .find((l) => lessonProgress(l, data.sessions).next)
    : undefined;
  const now = Date.now();
  const due = buildTodayReviewItems(data.records, data.contents, now).length;
  const favoriteDue = data.favorites.filter((f) => (f.fsrsCard?.due ?? f.nextReview ?? Infinity) <= now).length;
  const weak = [...data.weakSpots].sort(
    (a, b) => getGoalModuleBonus(focus, b.module) - getGoalModuleBonus(focus, a.module) || b.lastSeenAt - a.lastSeenAt,
  )[0];
  const todayProgress = dailyWorkspaceProgress(data.sessions, data.contents);
  const focusHref = focus === 'work' ? '/journal' : focus === 'exam' ? '/write' : '/pronunciation';
  const focusDetail =
    focus === 'work'
      ? t('Save a useful expression with its context', '积累实用表达并记录使用语境')
      : focus === 'exam'
        ? t('Reinforce spelling and sentence accuracy', '巩固拼写和句子准确性')
        : t('Explore sounds and listening contrasts', '练习发音与易混音听辨');
  const courseHref = unit
    ? `/learn/${encodeURIComponent(unit.id)}${lesson ? `?lesson=${encodeURIComponent(lesson.id)}` : ''}`
    : '/learn';
  const href = due ? '/review/today' : favoriteDue ? '/favorites/review' : courseHref;
  const tasks = [
    {
      icon: RotateCcw,
      title: t('Recall what you learned', '复习已学内容'),
      detail:
        due + favoriteDue
          ? t(`${due + favoriteDue} items due today`, `${due + favoriteDue} 项内容今天到期`)
          : t('Your review queue is clear', '今天没有到期复习'),
      href: due ? '/review/today' : '/favorites/review',
      done: due + favoriteDue === 0,
    },
    {
      icon: BookOpen,
      title: unit?.title ?? t('Choose your first material', '选择第一份材料'),
      detail: lesson
        ? t(
            `Lesson ${lesson.order + 1} · about ${lesson.estimatedMinutes} min`,
            `第 ${lesson.order + 1} 课 · 约 ${lesson.estimatedMinutes} 分钟`,
          )
        : t('Import something you want to understand', '导入你想学懂的内容'),
      href: courseHref,
      done: false,
    },
    {
      icon: Target,
      title: weak ? t('Focus on a weak spot', '针对薄弱点练习') : t('Practice your focus', '今日专项练习'),
      detail: weak?.text ?? focusDetail,
      href: weak?.targetHref ?? focusHref,
      done: false,
    },
  ];
  return (
    <section data-testid="today-workspace" className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="grid gap-8 p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
        <div className="flex flex-col items-start justify-center">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
            <Headphones className="h-4 w-4" />
            {t('Your daily practice', '今日学习')}
          </p>
          <h2 className="font-[var(--font-poppins)] text-3xl font-semibold tracking-tight text-indigo-950">
            {t('What to practice today', '今天练什么')}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
            {t(
              'Review what is due, continue your own material, then give a difficult sound another try.',
              '复习到期内容，继续学习自己的材料，再巩固一个薄弱点。',
            )}
          </p>
          <Link
            href={href}
            className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            {t('Start today’s practice', '开始今日学习')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/learn"
            className="mt-4 py-2 text-sm font-medium text-indigo-600 underline-offset-4 hover:underline"
          >
            {t(`All courses · ${data.units.length}`, `全部课程 · ${data.units.length}`)}
          </Link>
        </div>
        <ol className="divide-y divide-slate-100" aria-label={t('Today’s path', '今日学习路径')}>
          {tasks.map((task, i) => (
            <li key={task.title}>
              <Link href={task.href} className="flex items-center gap-4 rounded-xl px-2 py-5 hover:bg-indigo-50">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${task.done ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-600'}`}
                >
                  {task.done ? <CheckCircle2 className="h-5 w-5" /> : <task.icon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">0{i + 1}</p>
                  <p className="break-words text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.detail}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <LearningSettings practices={todayProgress.practices} words={todayProgress.words} />
      <div className="flex items-center gap-2 bg-slate-50 px-6 py-3 text-xs text-slate-600">
        <Clock className="h-4 w-4" />
        {t('Time is an estimate. You can pause and resume any lesson.', '时长为估算值。每课都可以随时暂停，下次继续。')}
      </div>
    </section>
  );
}
