'use client';

import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Headphones, Mic, PenTool } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LessonMedia } from '@/components/learning/lesson-media';
import { SingleItemPractice } from '@/components/shared/word-book-practice';
import { useLearningWorkspace } from '@/hooks/use-learning-workspace';
import { db } from '@/lib/db';
import { lessonProgress } from '@/lib/learning-units';
import { useLanguageStore } from '@/stores/language-store';

const icons = { listen: Headphones, read: BookOpen, speak: Mic, write: PenTool };
export default function CoursePage() {
  const params = useParams<{ unitId: string }>();
  const query = useSearchParams();
  const { data, error, retry } = useLearningWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState('');
  const [size, setSize] = useState(350);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const labels = {
    listen: t('Listen', '听'),
    read: t('Read aloud', '朗读'),
    speak: t('Speak', '说'),
    write: t('Type', '写'),
  };
  const unit = data?.units.find((u) => u.id === params.unitId || encodeURIComponent(u.id) === params.unitId);
  const lessons = data?.lessons.filter((l) => l.unitId === unit?.id).sort((a, b) => a.order - b.order) ?? [];
  const lesson =
    lessons.find((l) => l.id === (selected ?? query.get('lesson'))) ??
    lessons.find((l) => lessonProgress(l, data?.sessions ?? []).next) ??
    lessons[0];
  const progress = lesson ? lessonProgress(lesson, data?.sessions ?? []) : undefined;
  const index = stepIndex ?? Math.max(0, progress?.steps.findIndex((s) => !s.completed) ?? 0);
  const step = progress?.steps[Math.min(index, progress.total - 1)];
  const completed = lessons.filter((l) => !lessonProgress(l, data?.sessions ?? []).next).length;
  useEffect(() => {
    if (lesson) {
      if (selected === null) setSelected(lesson.id);
      if (stepIndex === null) setStepIndex(index);
    }
  }, [lesson, index, stepIndex, selected]);
  const openLesson = (id: string) => {
    setSelected(id);
    setStepIndex(null);
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
      <div role="alert">
        {error}
        <button onClick={retry} type="button">
          {t('Retry', '重试')}
        </button>
      </div>
    );
  if (!data) return <p role="status">{t('Preparing your course…', '正在准备课程…')}</p>;
  if (!unit || !lesson || !progress || !step)
    return (
      <div className="space-y-4">
        <p>
          {t(
            'This course is unavailable. Its sources may have been moved to the recycle bin.',
            '课程暂不可用，原始材料可能已移至回收站。',
          )}
        </p>
        <Link href="/learn" className="text-indigo-600">
          {t('Back to courses', '返回课程')}
        </Link>
      </div>
    );
  const Icon = icons[step.module];
  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-28">
      <header>
        <Link href="/learn" className="inline-flex min-h-11 items-center gap-2 text-sm text-indigo-600">
          <ArrowLeft className="h-4 w-4" />
          {t('My courses', '我的课程')}
        </Link>
        <h1 className="break-words font-[var(--font-poppins)] text-3xl font-semibold tracking-tight text-indigo-950">
          {unit.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t(
            `${completed} / ${lessons.length} lessons complete · Your original material is preserved`,
            `${completed} / ${lessons.length} 课已完成 · 原始材料完整保留`,
          )}
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="px-2 py-3 text-sm font-semibold text-slate-900">{t('Course outline', '课程目录')}</h2>
          <ol className="max-h-72 space-y-1 overflow-auto lg:max-h-[65vh]">
            {lessons.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openLesson(l.id)}
                  aria-current={l.id === lesson.id ? 'step' : undefined}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${l.id === lesson.id ? 'bg-indigo-50 font-semibold text-indigo-800' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="shrink-0 tabular-nums">
                    {!lessonProgress(l, data.sessions).next ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      String(l.order + 1).padStart(2, '0')
                    )}
                  </span>
                  <span className="min-w-0 break-words">{l.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <Link
            href={`/read/${encodeURIComponent(unit.sourceIds[0])}`}
            className="mt-4 block px-2 py-3 text-xs text-indigo-600"
          >
            {t('Open original material', '查看原始材料')}
          </Link>
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                  {t(`Lesson ${lesson.order + 1}`, `第 ${lesson.order + 1} 课`)}
                </p>
                <h2 className="mt-2 break-words text-xl font-semibold text-slate-900">{lesson.title}</h2>
              </div>
              <button
                type="button"
                className="min-h-11 px-3 text-sm text-indigo-600"
                onClick={() => {
                  setTitle(lesson.title);
                  setSize(data.contents.find((c) => c.id === unit.sourceIds[0])?.metadata?.courseWordsPerLesson ?? 350);
                  setEdit((v) => !v);
                }}
              >
                {t('Adjust lesson', '调整课程')}
              </button>
            </div>
            {edit && (
              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                <label className="block text-sm">
                  {t('Lesson title', '本课标题')}
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"
                  />
                </label>
                <label className="block text-sm">
                  {t('Text lesson size (course-wide)', '每课文字量（应用于本课程）')}
                  <select
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="ml-3 min-h-11 rounded-lg border border-slate-200 bg-white px-3"
                  >
                    <option value={150}>150 {t('words', '词')}</option>
                    <option value={350}>350 {t('words', '词')}</option>
                    <option value={600}>600 {t('words', '词')}</option>
                  </select>
                </label>
                <p className="text-xs text-slate-600">
                  {t(
                    'Re-splitting creates automatically titled exercises; you can rename them afterward. Previous practice remains in history. Timed media keeps 5-minute boundaries and vocabulary keeps 20 items.',
                    '重新切分会生成自动命名的新练习，之后可再修改标题；旧练习记录仍保留。字幕按约 5 分钟切分，词表每课 20 项。',
                  )}
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="min-h-11 rounded-xl bg-indigo-600 px-4 text-white disabled:opacity-50"
                >
                  {saving ? t('Saving…', '保存中…') : t('Save adjustments', '保存调整')}
                </button>
                {saveError && <p role="alert">{saveError}</p>}
              </div>
            )}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {lesson.modules.map((module) => {
                const ModuleIcon = icons[module];
                const moduleSteps = progress.steps.filter((s) => s.module === module);
                const done = moduleSteps.every((s) => s.completed);
                return (
                  <button
                    type="button"
                    key={module}
                    onClick={() => setStepIndex(progress.steps.findIndex((s) => s.module === module))}
                    aria-pressed={step.module === module}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs sm:flex-row sm:gap-2 ${step.module === module ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <ModuleIcon className="h-4 w-4" />}
                    {labels[module]}
                  </button>
                );
              })}
            </div>
            <progress
              aria-label={t('Lesson progress', '课时进度')}
              max={progress.total}
              value={progress.completed}
              className="mt-4 block h-1.5 w-full overflow-hidden rounded-full appearance-none [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              {t(
                `${progress.completed} / ${progress.total} exercises completed`,
                `${progress.completed} / ${progress.total} 个练习已完成`,
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Icon className="h-4 w-4 text-indigo-600" />
            {labels[step.module]} ·{' '}
            {t(
              `Item ${(index % lesson.exercises.length) + 1} of ${lesson.exercises.length}`,
              `第 ${(index % lesson.exercises.length) + 1} / ${lesson.exercises.length} 项`,
            )}
          </div>
          {step.module === 'listen' && step.item.metadata?.audioUrl && (
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
            <p role="status" className="text-sm text-slate-600">
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
                else window.location.assign('/dashboard');
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('Continue', '继续')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
