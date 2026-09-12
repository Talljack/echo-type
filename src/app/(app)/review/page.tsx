'use client';

import { ArrowRight, BookOpen, Heart, Radar } from 'lucide-react';
import Link from 'next/link';
import { DailyTaskQueue } from '@/components/learning/daily-task-queue';
import { useReviewSummary } from '@/hooks/use-review-summary';
import { useLanguageStore } from '@/stores/language-store';

export default function ReviewCenterPage() {
  const { data, error, retry } = useReviewSummary();
  const zh = useLanguageStore((s) => s.interfaceLanguage) === 'zh';
  const t = (en: string, cn: string) => (zh ? cn : en);
  const queues = data
    ? [
        {
          href: '/review/today',
          title: t('Lesson review', '课程复习'),
          icon: BookOpen,
          count: data.lessons,
          description: t(
            'Revisit due exercises from your listening, speaking, reading and spelling practice.',
            '复习已到期的听、说、读和拼写练习。',
          ),
        },
        {
          href: '/favorites/review',
          title: t('Notes review', '笔记复习'),
          icon: Heart,
          count: data.notes,
          description: t(
            'Recall saved words and expressions with spaced repetition.',
            '通过间隔复习，回忆收藏的单词和表达。',
          ),
        },
        {
          href: '/weak-spots',
          title: t('Weak spots', '薄弱项'),
          icon: Radar,
          count: data.weakSpots,
          description: t(
            'Retry difficult items and check what still needs attention.',
            '重练困难内容，查看还需要加强的地方。',
          ),
        },
      ]
    : [];
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <DailyTaskQueue reviewOnly />
      <p className="text-sm text-slate-600">
        {t(
          'Choose a queue. Each keeps its own progress and review schedule.',
          '选择一项开始，每类练习保留各自的进度和复习安排。',
        )}
      </p>
      {error ? (
        <div role="alert" className="rounded-xl bg-amber-50 p-5">
          {t('Could not load review queues.', '暂时无法加载复习内容。')}
          <button type="button" className="ml-3 min-h-11 underline" onClick={retry}>
            {t('Retry', '重试')}
          </button>
        </div>
      ) : !data ? (
        <output>{t('Loading review queues…', '正在加载复习内容…')}</output>
      ) : (
        <div data-testid="review-queues" className="divide-y divide-slate-200 rounded-2xl bg-white px-5 shadow-sm">
          {queues.map((queue) => (
            <Link
              key={queue.href}
              href={queue.href}
              className="group flex items-center gap-4 py-6 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <queue.icon className="h-6 w-6 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">{queue.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{queue.description}</p>
                <p className="mt-2 text-sm font-medium text-indigo-600">
                  {queue.count
                    ? t(`${queue.count} ready to review`, `${queue.count} 项待复习`)
                    : t('Nothing due. View this section', '暂无待复习，查看此分区')}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-indigo-600" />
            </Link>
          ))}
        </div>
      )}
      <Link href="/learn" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-600">
        {t('Continue learning', '继续学习')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
