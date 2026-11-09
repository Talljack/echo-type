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
          tone: 'bg-brand-soft text-brand-ink',
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
          tone: 'bg-danger-soft text-danger-ink',
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
          tone: 'bg-warning-soft text-warning-ink',
          count: data.weakSpots,
          description: t(
            'Retry difficult items and check what still needs attention.',
            '重练困难内容，查看还需要加强的地方。',
          ),
        },
      ]
    : [];
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-24">
      <DailyTaskQueue reviewOnly />
      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{t('Review queues', '复习队列')}</h2>
          <p className="mt-0.5 text-sm text-ink-3">
            {t(
              'Choose a queue. Each keeps its own progress and review schedule.',
              '选择一项开始，每类练习保留各自的进度和复习安排。',
            )}
          </p>
        </div>
        {error ? (
          <div role="alert" className="rounded-xl bg-warning-soft p-5 text-sm text-warning-ink">
            {t('Could not load review queues.', '暂时无法加载复习内容。')}
            <button type="button" className="ml-3 min-h-10 font-semibold underline" onClick={retry}>
              {t('Retry', '重试')}
            </button>
          </div>
        ) : !data ? (
          <output className="block text-sm text-ink-3">{t('Loading review queues…', '正在加载复习内容…')}</output>
        ) : (
          <div data-testid="review-queues" className="grid gap-3 md:grid-cols-3">
            {queues.map((queue) => (
              <Link
                key={queue.href}
                href={queue.href}
                className="card-paper group flex flex-col gap-4 p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-xl ${queue.tone}`}>
                    <queue.icon className="size-[18px]" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                      queue.count ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-4'
                    }`}
                  >
                    {queue.count}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-ink">{queue.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{queue.description}</p>
                </div>
                <p className="flex items-center justify-between text-sm font-semibold text-brand-ink">
                  {queue.count
                    ? t(`${queue.count} ready to review`, `${queue.count} 项待复习`)
                    : t('Nothing due. View this section', '暂无待复习，查看此分区')}
                  <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Link
        href="/learn"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-ink hover:underline"
      >
        {t('Continue learning', '继续学习')}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
