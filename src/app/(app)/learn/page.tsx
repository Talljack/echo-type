'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookMarked,
  BookOpenText,
  CheckCircle2,
  FileText,
  ListMusic,
  MessagesSquare,
  Plus,
  Search,
  Target,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmptyState, PageHeader } from '@/components/layout/page-header';
import { QuickPractice } from '@/components/learning/quick-practice';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { db } from '@/lib/db';
import { MATERIAL_LABELS, MATERIAL_TYPES } from '@/lib/material-types';
import { deriveTextCycle } from '@/lib/text-learning-cycle';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import type { MaterialType, TypingSession } from '@/types/content';
import type { LearningAttempt } from '@/types/learning-activity';
import type { LearningUnit, Lesson } from '@/types/learning-unit';

const MATERIAL_ICONS: Record<MaterialType, LucideIcon> = {
  video: Video,
  reading: FileText,
  wordbook: BookMarked,
  dialogue: MessagesSquare,
  sentences: ListMusic,
  scenario: Target,
};

interface CourseSummary {
  unit: LearningUnit;
  type: MaterialType;
  lessons: Lesson[];
  completed: number;
  drills: number;
  nextLesson?: Lesson;
  lastActivity: number;
}

function summarize(
  units: LearningUnit[],
  lessons: Lesson[],
  attempts: LearningAttempt[],
  sessions: TypingSession[],
  now: number,
): CourseSummary[] {
  // Same evidence rule as lessonProgress(), built once instead of per lesson.
  const evidence = new Set(sessions.filter((s) => s.completed).map((s) => `${s.contentId}:${s.module}`));
  const lessonsByUnit = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const list = lessonsByUnit.get(lesson.unitId);
    if (list) list.push(lesson);
    else lessonsByUnit.set(lesson.unitId, [lesson]);
  }
  const attemptsByLesson = new Map<string, LearningAttempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByLesson.get(attempt.lessonId);
    if (list) list.push(attempt);
    else attemptsByLesson.set(attempt.lessonId, [attempt]);
  }
  return units.map((unit) => {
    const own = [...(lessonsByUnit.get(unit.id) ?? [])].sort((a, b) => a.order - b.order);
    let completed = 0;
    let drills = 0;
    let lastActivity = 0;
    let nextLesson: Lesson | undefined;
    for (const lesson of own) {
      const lessonAttempts = attemptsByLesson.get(lesson.id) ?? [];
      for (const attempt of lessonAttempts) lastActivity = Math.max(lastActivity, attempt.createdAt);
      const done = deriveTextCycle(
        lesson.id,
        lesson.exercises.map((item) => item.text).join('\n\n'),
        lessonAttempts,
        now,
      ).completed;
      if (done) completed += 1;
      else nextLesson ??= lesson;
      if (lesson.modules.every((module) => lesson.exercises.every((item) => evidence.has(`${item.id}:${module}`))))
        drills += 1;
    }
    return {
      unit,
      type:
        unit.materialType ?? (unit.kind === 'vocabulary' ? 'wordbook' : unit.kind === 'media' ? 'video' : 'reading'),
      lessons: own,
      completed,
      drills,
      nextLesson,
      lastActivity: Math.max(lastActivity, 0),
    };
  });
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max || 1}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LearnPage() {
  const { data, error, retry } = useLearningWorkspace();
  const attempts = useLiveQuery(() => db.learningAttempts.toArray(), [data?.database.name]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MaterialType | 'all'>('all');
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);

  const courses = useMemo(
    () =>
      data && attempts
        ? summarize(data.units, data.lessons, attempts, data.sessions, Date.now()).sort(
            (a, b) => b.unit.updatedAt - a.unit.updatedAt,
          )
        : undefined,
    [data, attempts],
  );

  const resume = useMemo(
    () =>
      courses
        ?.filter((course) => course.lastActivity > 0 && course.nextLesson)
        .sort((a, b) => b.lastActivity - a.lastActivity)[0],
    [courses],
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<MaterialType, number>();
    for (const course of courses ?? []) counts.set(course.type, (counts.get(course.type) ?? 0) + 1);
    return counts;
  }, [courses]);

  const query = search.trim().toLowerCase();
  const visible = (courses ?? []).filter(
    (course) => (filter === 'all' || course.type === filter) && course.unit.title.toLowerCase().includes(query),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-24">
      <PageHeader
        eyebrow={t('Courses', '课程')}
        title={t('Your learning shelf', '我的课程')}
        description={t(
          'Every material you add becomes a course of short lessons. Your original text and progress stay with you.',
          '添加的每份材料都会变成一门由短课组成的课程，原文与学习记录完整保留。',
        )}
        actions={
          <Link
            href="/library/import"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand shadow-xs transition-colors hover:bg-brand-strong"
          >
            <Plus className="size-4" />
            {t('Import material', '导入材料')}
          </Link>
        }
      />

      {resume && resume.nextLesson && (
        <Link
          href={`/learn/${encodeURIComponent(resume.unit.id)}?lesson=${encodeURIComponent(resume.nextLesson.id)}`}
          className="card-paper group flex flex-col gap-4 p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:p-6"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
            <BookOpenText className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="eyebrow text-brand-ink">{t('Continue where you left off', '从上次停下的地方继续')}</span>
            <span className="mt-1 block truncate text-lg font-semibold text-ink">{resume.unit.title}</span>
            <span className="mt-0.5 block truncate text-sm text-ink-3">
              {t(`Next: lesson ${resume.nextLesson.order + 1}`, `下一课：第 ${resume.nextLesson.order + 1} 课`)} ·{' '}
              {resume.nextLesson.title}
            </span>
          </span>
          <span className="flex w-full items-center gap-3 sm:w-56">
            <ProgressBar
              value={resume.completed}
              max={resume.lessons.length}
              label={t('Course progress', '课程进度')}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-3">
              {resume.completed}/{resume.lessons.length}
            </span>
          </span>
          <ArrowRight className="hidden size-5 shrink-0 text-brand-ink transition-transform group-hover:translate-x-0.5 sm:block" />
        </Link>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-4 shadow-xs focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring/15">
            <Search className="size-4 shrink-0 text-ink-4" />
            <input
              aria-label={t('Search courses', '搜索课程')}
              className="w-full bg-transparent text-sm text-ink outline-none"
              placeholder={t('Find a course…', '查找课程…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div
            role="group"
            aria-label={t('Filter by material type', '按材料类型筛选')}
            className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1"
          >
            {(['all', ...MATERIAL_TYPES.filter((type) => typeCounts.has(type))] as const).map((type) => {
              const active = filter === type;
              const count = type === 'all' ? (courses?.length ?? 0) : (typeCounts.get(type) ?? 0);
              const Icon = type === 'all' ? null : MATERIAL_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(type)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                    active ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2',
                  )}
                >
                  {Icon && <Icon className="size-3.5" />}
                  {type === 'all' ? t('All', '全部') : MATERIAL_LABELS[type][zh ? 1 : 0]}
                  <span className={cn('tabular-nums', active ? 'text-canvas/70' : 'text-ink-4')}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger-ink">
            {t('Unable to load courses.', '无法加载课程。')}{' '}
            <button type="button" onClick={retry} className="font-semibold underline">
              {t('Retry', '重试')}
            </button>
          </div>
        ) : !courses ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            <p role="status" className="sr-only">
              {t('Preparing lessons…', '正在准备课程…')}
            </p>
            {[0, 1, 2].map((key) => (
              <div key={key} className="card-paper h-48 animate-pulse bg-surface-2" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={<BookOpenText />}
            title={t('No courses yet', '还没有课程')}
            description={t(
              'Import an article, book, or audio to start your first course.',
              '导入文章、书籍或音频，开始第一门课程。',
            )}
            action={
              <Link
                href="/library/import"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-strong"
              >
                <Plus className="size-4" />
                {t('Import material', '导入材料')}
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title={t('No matching courses', '没有匹配的课程')}
            description={t('Try another name or material type.', '换个名称或材料类型试试。')}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ unit, type, lessons, completed, drills }) => {
              const Icon = MATERIAL_ICONS[type];
              const done = lessons.length > 0 && completed === lessons.length;
              return (
                <Link
                  key={unit.id}
                  href={`/learn/${encodeURIComponent(unit.id)}`}
                  className="card-paper group flex flex-col p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      {unit.difficulty && (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold capitalize text-ink-3">
                          {unit.difficulty}
                        </span>
                      )}
                      {done && <CheckCircle2 className="size-4 text-success" aria-label={t('Completed', '已完成')} />}
                    </span>
                  </div>
                  <h2 className="mt-4 line-clamp-2 break-words text-[17px] font-semibold leading-snug text-ink">
                    {unit.title}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {MATERIAL_LABELS[type][zh ? 1 : 0]} ·{' '}
                    {t(
                      `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'} · ${completed} completed`,
                      `${lessons.length} 课 · 已完成 ${completed} 课`,
                    )}
                  </p>
                  {drills > 0 && (
                    <p className="mt-0.5 text-xs text-ink-4">
                      {t(`${drills} drill ${drills === 1 ? 'lesson' : 'lessons'} complete`, `${drills} 课专项练习完成`)}
                    </p>
                  )}
                  <div className="mt-auto pt-5">
                    <ProgressBar value={completed} max={lessons.length} label={t('Course progress', '课程进度')} />
                    <div className="mt-3 flex items-center justify-between text-sm font-semibold text-brand-ink">
                      {t(completed ? 'Continue course' : 'Open course', completed ? '继续课程' : '开始课程')}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <QuickPractice />
    </div>
  );
}
