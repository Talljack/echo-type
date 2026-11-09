'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Headphones,
  Keyboard,
  ListChecks,
  MessagesSquare,
  Mic,
  PenLine,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { LessonMedia } from '@/components/learning/lesson-media';
import { LessonStudio } from '@/components/learning/lesson-studio';
import { LessonWorkshop } from '@/components/learning/lesson-workshop';
import { VocabularyWorkspace } from '@/components/learning/vocabulary-workspace';
import { SkillTile } from '@/components/shared/skill';
import { SingleItemPractice } from '@/components/shared/word-book-practice';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { db } from '@/lib/db';
import { lessonProgress } from '@/lib/learning-units';
import { MATERIAL_LABELS } from '@/lib/material-types';
import { deriveTextCycle, type TextCycleState } from '@/lib/text-learning-cycle';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/language-store';
import type { LearningAttempt } from '@/types/learning-activity';
import type { Lesson } from '@/types/learning-unit';

type PracticeMode = 'studio' | 'cycle' | 'drills';
const DRILL_ICONS = { listen: Headphones, read: BookOpen, speak: Mic, write: Keyboard };

function hasTimedMedia(lesson: Lesson) {
  const first = lesson.exercises[0];
  return Boolean(first?.metadata?.timestamps?.length || first?.metadata?.audioUrl);
}

/** Text-cycle state for every lesson, computed once per data change. */
function useCycleStates(lessons: Lesson[], attempts: LearningAttempt[]) {
  return useMemo(() => {
    const byLesson = new Map<string, LearningAttempt[]>();
    for (const attempt of attempts) {
      const list = byLesson.get(attempt.lessonId);
      if (list) list.push(attempt);
      else byLesson.set(attempt.lessonId, [attempt]);
    }
    const now = Date.now();
    return new Map<string, TextCycleState>(
      lessons.map((lesson) => [
        lesson.id,
        deriveTextCycle(
          lesson.id,
          lesson.exercises.map((item) => item.text).join('\n\n'),
          byLesson.get(lesson.id) ?? [],
          now,
        ),
      ]),
    );
  }, [lessons, attempts]);
}

export default function CoursePage() {
  const params = useParams<{ unitId: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const { data, error, retry } = useLearningWorkspace();
  const attempts = useLiveQuery(() => db.learningAttempts.toArray(), [data?.database.name]) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [modeChoice, setModeChoice] = useState<PracticeMode | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState('');
  const [size, setSize] = useState(350);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const labels = {
    listen: t('Listen', '听'),
    read: t('Read aloud', '朗读'),
    speak: t('Speak', '说'),
    write: t('Type', '写'),
  };

  const unit = data?.units.find((u) => u.id === params.unitId || encodeURIComponent(u.id) === params.unitId);
  const lessons = useMemo(
    () => data?.lessons.filter((l) => l.unitId === unit?.id).sort((a, b) => a.order - b.order) ?? [],
    [data?.lessons, unit?.id],
  );
  const cycles = useCycleStates(lessons, attempts);
  const coreDone = (lesson: Lesson) => {
    const stages = cycles.get(lesson.id)?.stages;
    return Boolean(stages?.understand && stages.output && stages.correct);
  };
  // Recall unlocks a day later, so "current" is the first lesson not yet through Correct.
  const lesson =
    lessons.find((l) => l.id === (selected ?? query.get('lesson'))) ??
    lessons.find((l) => !coreDone(l)) ??
    lessons.find((l) => !cycles.get(l.id)?.completed) ??
    lessons[0];
  const progress = lesson ? lessonProgress(lesson, data?.sessions ?? []) : undefined;
  const index = stepIndex ?? Math.max(0, progress?.steps.findIndex((s) => !s.completed) ?? 0);
  const step = progress?.steps[Math.min(index, progress.total - 1)];
  const completed = lessons.filter((l) => cycles.get(l.id)?.completed).length;
  const drillsCompleted = useMemo(() => {
    const sessions = data?.sessions ?? [];
    const evidence = new Set(sessions.filter((s) => s.completed).map((s) => `${s.contentId}:${s.module}`));
    return lessons.filter((l) => l.modules.every((m) => l.exercises.every((item) => evidence.has(`${item.id}:${m}`))))
      .length;
  }, [lessons, data?.sessions]);

  const requestedMode = query.get('mode');
  const defaultMode: PracticeMode =
    requestedMode === 'studio' || requestedMode === 'cycle' || requestedMode === 'drills'
      ? requestedMode
      : query.get('stage') || query.get('weakSpot')
        ? 'cycle'
        : query.get('drill')
          ? 'drills'
          : lesson && hasTimedMedia(lesson)
            ? 'studio'
            : 'cycle';
  const mode = modeChoice ?? defaultMode;

  useEffect(() => {
    if (lesson) {
      if (selected === null) setSelected(lesson.id);
      if (stepIndex === null) setStepIndex(index);
    }
  }, [lesson, index, stepIndex, selected]);

  const openLesson = (id: string) => {
    setSelected(id);
    setStepIndex(null);
    setOutlineOpen(false);
    const next = new URLSearchParams(query.toString());
    next.set('lesson', id);
    next.delete('stage');
    next.delete('weakSpot');
    router.replace(`?${next.toString()}`, { scroll: false });
  };
  const save = async () => {
    if (!unit || !lesson) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.transaction('rw', db.contents, async () => {
        for (const sourceId of unit.sourceIds) {
          const source = await db.contents.get(sourceId);
          if (!source) continue;
          await db.contents.update(source.id, {
            metadata: {
              ...source.metadata,
              courseWordsPerLesson: size,
              ...(sourceId === unit.sourceIds[0]
                ? { lessonTitles: { ...source.metadata?.lessonTitles, [lesson.id]: title.trim() || lesson.title } }
                : {}),
            },
            updatedAt: Date.now(),
          });
        }
      });
      setEdit(false);
      setStepIndex(null);
    } catch {
      setSaveError(t('Could not save changes. Try again.', '保存失败，请重试。'));
    } finally {
      setSaving(false);
    }
  };

  if (error)
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-xl bg-danger-soft p-5 text-sm text-danger-ink">
        {error}{' '}
        <button onClick={retry} type="button" className="font-semibold underline">
          {t('Retry', '重试')}
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-7xl space-y-4" aria-busy="true">
        <p role="status" className="sr-only">
          {t('Preparing your course…', '正在准备课程…')}
        </p>
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  if (!unit || !lesson || !progress || !step)
    return (
      <div className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-dashed border-line-strong p-8 text-center">
        <p className="text-ink-2">
          {t(
            'This course is unavailable. Its sources may have been moved to the recycle bin.',
            '课程暂不可用，原始材料可能已移至回收站。',
          )}
        </p>
        <Link href="/learn" className="font-semibold text-brand-ink hover:underline">
          {t('Back to courses', '返回课程')}
        </Link>
      </div>
    );

  if (unit.materialType === 'wordbook')
    return (
      <main className="mx-auto max-w-5xl space-y-6 pb-24">
        <PageHeader
          back={{ href: '/library', label: t('Back to learning materials', '返回学习材料') }}
          eyebrow={MATERIAL_LABELS.wordbook[zh ? 1 : 0]}
          title={unit.title}
        />
        <VocabularyWorkspace
          key={unit.id}
          data={data}
          scopeIds={unit.sourceIds}
          baseHref={`/learn/${encodeURIComponent(unit.id)}`}
        />
      </main>
    );

  const Icon = DRILL_ICONS[step.module];
  const mediaLesson = unit.materialType === 'video' || Boolean(lesson.exercises[0].metadata?.audioUrl);
  const cycle = cycles.get(lesson.id);
  const modes: { id: PracticeMode; label: string; hint: string; icon: typeof AudioLines }[] = [
    {
      id: 'studio',
      label: t('Sentence studio', '逐句精练'),
      hint: t('Listen, dictate and shadow line by line', '逐句精听、听写与跟读'),
      icon: AudioLines,
    },
    {
      id: 'cycle',
      label: t('Understand & write', '理解与表达'),
      hint: t('Main idea, your own words, correction, recall', '理解大意、输出、纠错与回忆'),
      icon: PenLine,
    },
    {
      id: 'drills',
      label: t('Listen · Read aloud · Speak · Type', '听 · 朗读 · 说 · 打字'),
      hint: t('Whole-text drills for each skill', '整篇分技能练习'),
      icon: ListChecks,
    },
  ];
  const talkHref = `/speak/free?unit=${encodeURIComponent(unit.id)}&lesson=${encodeURIComponent(lesson.id)}`;

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-28">
      <PageHeader
        back={{ href: '/learn', label: t('Courses', '课程') }}
        eyebrow={
          <>
            {unit.materialType ? MATERIAL_LABELS[unit.materialType][zh ? 1 : 0] : t('Course', '课程')}
            {unit.difficulty ? ` · ${unit.difficulty}` : ''}
          </>
        }
        title={unit.title}
        actions={
          <Link
            href={talkHref}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-ink shadow-xs transition-colors hover:bg-surface-2"
          >
            <MessagesSquare className="size-4 text-speak-ink" />
            {t('Talk about this lesson', '就本课进行对话')}
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-ink-3">
          <p>
            {t(
              `${completed} / ${lessons.length} lessons complete · Your original material is preserved`,
              `${completed} / ${lessons.length} 课已完成 · 原始材料完整保留`,
            )}
          </p>
          <p className="text-xs text-ink-4">
            {t(
              `${drillsCompleted} drill lessons complete · separate from comprehension and writing`,
              `${drillsCompleted} 课专项练习完成 · 与理解表达闭环分开统计`,
            )}
          </p>
        </div>
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="card-paper p-3 lg:sticky lg:top-6">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left text-sm font-semibold text-ink focus-visible:ring-2 focus-visible:ring-ring/40 lg:hidden"
            aria-expanded={outlineOpen}
            aria-controls="course-outline"
            onClick={() => setOutlineOpen((value) => !value)}
          >
            <span>
              {t('Course outline', '课程目录')} · {lesson.order + 1}/{lessons.length}
            </span>
            <ChevronDown className={cn('size-4 text-ink-4 transition-transform', outlineOpen && 'rotate-180')} />
          </button>
          <div id="course-outline" className={outlineOpen ? 'block' : 'hidden lg:block'}>
            <h2 className="eyebrow px-2 pt-2 pb-2">{t('Course outline', '课程目录')}</h2>
            <ol className="scrollbar-thin max-h-72 space-y-0.5 overflow-auto lg:max-h-[62vh]">
              {lessons.map((l) => {
                const state = cycles.get(l.id);
                const current = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => openLesson(l.id)}
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                        current ? 'bg-brand-soft font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums',
                          state?.completed
                            ? 'bg-success-soft text-success-ink'
                            : current
                              ? 'bg-brand text-on-brand'
                              : 'bg-surface-2 text-ink-3',
                        )}
                      >
                        {state?.completed ? <CheckCircle2 className="size-4" /> : l.order + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words">{l.title}</span>
                        {!!state?.completedSteps && !state.completed && (
                          <span className="mt-0.5 block text-[11px] font-medium text-ink-4">
                            {state.completedSteps}/5 {t('stages', '阶段')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <Link
              href={`/read/${encodeURIComponent(unit.sourceIds[0])}`}
              className="mt-2 flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <BookOpen className="size-3.5" />
              {t('Open original material', '查看原始材料')}
            </Link>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">
                {t(`Lesson ${lesson.order + 1} of ${lessons.length}`, `第 ${lesson.order + 1} / ${lessons.length} 课`)}
              </p>
              <h2 className="mt-1 break-words text-xl font-semibold text-ink">{lesson.title}</h2>
            </div>
            {cycle && (
              <p className="text-xs font-medium text-ink-3">
                {t(`${cycle.completedSteps}/5 stages`, `${cycle.completedSteps}/5 阶段`)} · ~{lesson.estimatedMinutes}{' '}
                {t('min', '分钟')}
              </p>
            )}
          </div>

          {lesson.exercises[0].metadata?.scenario && (
            <section className="space-y-1.5 rounded-2xl border border-speak/20 bg-speak-soft p-4 text-sm text-ink-2">
              <h2 className="font-semibold text-speak-ink">{t('Scenario task', '场景任务')}</h2>
              <p>{lesson.exercises[0].metadata.scenario.situation}</p>
              <p>
                <span className="font-semibold text-ink">{t('Your role: ', '你的角色：')}</span>
                {lesson.exercises[0].metadata.scenario.role}
              </p>
              <p>
                <span className="font-semibold text-ink">{t('Goal: ', '目标：')}</span>
                {lesson.exercises[0].metadata.scenario.goal}
              </p>
            </section>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {modes.map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setModeChoice(item.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors active:scale-[0.99]',
                    active
                      ? 'border-brand bg-brand-soft ring-1 ring-brand'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      active ? 'bg-brand text-on-brand' : 'bg-surface-2 text-ink-3',
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-3">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {mode !== 'studio' && mediaLesson && <LessonMedia key={lesson.id} item={lesson.exercises[0]} />}

          {mode === 'studio' ? (
            <LessonStudio key={lesson.id} lesson={lesson} zh={zh} />
          ) : mode === 'cycle' ? (
            <LessonWorkshop
              key={`${lesson.id}:${query.get('weakSpot') ?? ''}`}
              lesson={lesson}
              zh={zh}
              sourceWeakSpotId={query.get('weakSpot') ?? undefined}
            />
          ) : (
            <>
              <div className="card-paper p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{t(`Lesson ${lesson.order + 1}`, `第 ${lesson.order + 1} 课`)}</p>
                    <h2 className="mt-1 break-words text-lg font-semibold text-ink">{lesson.title}</h2>
                  </div>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-3 hover:bg-surface-2 hover:text-ink"
                    onClick={() => {
                      setTitle(lesson.title);
                      setSize(
                        data.contents.find((c) => c.id === unit.sourceIds[0])?.metadata?.courseWordsPerLesson ?? 350,
                      );
                      setEdit((v) => !v);
                    }}
                  >
                    <Settings2 className="size-4" />
                    {t('Adjust lesson', '调整课程')}
                  </button>
                </div>
                {edit && (
                  <div className="mt-4 space-y-3 rounded-xl bg-surface-2 p-4">
                    <label className="block text-sm font-medium text-ink-2">
                      {t('Lesson title', '本课标题')}
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-ink"
                      />
                    </label>
                    <label className="block text-sm font-medium text-ink-2">
                      {t('Text lesson size (course-wide)', '每课文字量（应用于本课程）')}
                      <select
                        value={size}
                        onChange={(e) => setSize(Number(e.target.value))}
                        className="ml-3 min-h-10 rounded-lg border border-line-strong bg-surface px-3 text-ink"
                      >
                        <option value={150}>150 {t('words', '词')}</option>
                        <option value={350}>350 {t('words', '词')}</option>
                        <option value={600}>600 {t('words', '词')}</option>
                      </select>
                    </label>
                    <p className="text-xs text-ink-3">
                      {t(
                        'Re-splitting creates automatically titled exercises; you can rename them afterward. Previous practice remains in history. Timed media keeps 5-minute boundaries and vocabulary keeps 20 items.',
                        '重新切分会生成自动命名的新练习，之后可再修改标题；旧练习记录仍保留。字幕按约 5 分钟切分，词表每课 20 项。',
                      )}
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void save()}
                      className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50"
                    >
                      {saving ? t('Saving…', '保存中…') : t('Save adjustments', '保存调整')}
                    </button>
                    {saveError && (
                      <p role="alert" className="text-sm text-danger-ink">
                        {saveError}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {lesson.modules.map((module) => {
                    const moduleSteps = progress.steps.filter((s) => s.module === module);
                    const done = moduleSteps.every((s) => s.completed);
                    const active = step.module === module;
                    return (
                      <button
                        type="button"
                        key={module}
                        onClick={() => setStepIndex(progress.steps.findIndex((s) => s.module === module))}
                        aria-pressed={active}
                        className={cn(
                          'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2',
                          active ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className={cn('size-4', active ? 'text-canvas' : 'text-success')} />
                        ) : (
                          <SkillTile skill={module} size="sm" className={active ? 'bg-transparent text-canvas' : ''} />
                        )}
                        {labels[module]}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <progress
                    aria-label={t('Lesson progress', '课时进度')}
                    max={progress.total}
                    value={progress.completed}
                    className="block h-1.5 w-full appearance-none [&::-moz-progress-bar]:bg-success [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-success"
                  />
                </div>
                <p className="mt-2 text-xs text-ink-3">
                  {t(
                    `${progress.completed} / ${progress.total} exercises completed`,
                    `${progress.completed} / ${progress.total} 个练习已完成`,
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-2">
                <Icon className="size-4 text-brand-ink" />
                {labels[step.module]} ·{' '}
                {t(
                  `Item ${(index % lesson.exercises.length) + 1} of ${lesson.exercises.length}`,
                  `第 ${(index % lesson.exercises.length) + 1} / ${lesson.exercises.length} 项`,
                )}
              </div>
              {!mediaLesson && step.module === 'listen' && step.item.metadata?.audioUrl && (
                <LessonMedia key={`audio:${step.item.id}`} item={step.item} />
              )}
              <SingleItemPractice
                key={`${lesson.id}:${step.item.id}:${step.module}`}
                item={step.item}
                module={step.module}
                course
                onWriteNext={
                  step.module === 'write' && progress.steps[index + 1]?.module === 'write'
                    ? () => setStepIndex((current) => (current === index ? index + 1 : current))
                    : undefined
                }
              />
              <div className="card-paper flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <p role="status" className="text-sm text-ink-3">
                  {step.completed
                    ? t('Practice saved. Ready for the next step.', '练习已保存，可以继续下一步。')
                    : t(
                        'Complete this exercise to continue. Your progress saves automatically.',
                        '完成当前练习后继续，进度将自动保存。',
                      )}
                </p>
                <button
                  type="button"
                  disabled={!step.completed}
                  onClick={() => {
                    if (index + 1 < progress.total) setStepIndex(index + 1);
                    else if (lessons[lesson.order + 1]) openLesson(lessons[lesson.order + 1].id);
                    else router.push('/dashboard');
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('Continue', '继续')}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </>
          )}

          {lessons[lesson.order + 1] && (
            <button
              type="button"
              onClick={() => openLesson(lessons[lesson.order + 1].id)}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="min-w-0">
                <span className="eyebrow">{t('Up next', '下一课')}</span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
                  {lessons[lesson.order + 1].title}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
