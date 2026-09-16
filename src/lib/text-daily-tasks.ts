import { nanoid } from 'nanoid';
import type { DailyTask } from '@/types/daily-task';
import type { LearningAttempt } from '@/types/learning-activity';
import type { Lesson } from '@/types/learning-unit';
import { toLocalDateKey } from './date-key';
import { deriveTextCycle } from './text-learning-cycle';

const labels = {
  understand: [
    'Understand the source',
    '理解原文',
    'Explain the main idea with a quote from the source.',
    '用原文证据说明主旨。',
    4,
  ],
  output: [
    'Write in your own words',
    '用自己的话表达',
    'You understood the source. Write an original response.',
    '已经理解原文，下一步写出自己的回答。',
    5,
  ],
  correct: [
    'Improve your draft',
    '修改初稿',
    'Compare your draft with a revision and explain one improvement.',
    '对照初稿完成修改，并说明一处改进。',
    4,
  ],
  recall: [
    'Recall without the source',
    '脱离原文回忆',
    'Your delayed recall is due. Retrieve the corrected idea, then rate honestly.',
    '延迟回忆已到期，先回忆修改后的内容，再如实自评。',
    3,
  ],
  apply: [
    'Use it in a new context',
    '迁移到新情境',
    'Recall succeeded. Use a source expression in a different situation.',
    '回忆成功，将原文表达用于一个不同的情境。',
    4,
  ],
} as const;

/** One exact next-stage target per lesson, including scheduled recall for reconciliation. */
export function buildTextCourseTasks(lessons: Lesson[], attempts: LearningAttempt[], now: number): DailyTask[] {
  const dateKey = toLocalDateKey(now);
  return lessons.map((lesson) => {
    const sourceText = lesson.exercises.map((item) => item.text).join('\n\n');
    const cycle = deriveTextCycle(lesson.id, sourceText, attempts, now);
    const stage = cycle.completed ? 'recall' : cycle.nextStage;
    const referenceAttemptId =
      stage === 'output'
        ? cycle.evidence.understand
        : stage === 'correct'
          ? cycle.evidence.output
          : stage === 'recall' || stage === 'apply'
            ? cycle.referenceAttemptId
            : undefined;
    const dueAt = stage === 'recall' ? cycle.dueAt : undefined;
    const supported = stage === 'recall' && (cycle.lastRecallAssisted || cycle.lastRecallRating === 'again');
    const [label, labelZh, reason, reasonZh, duration] = labels[stage];
    return {
      id: `${dateKey}:course:${lesson.id}:${stage}:${nanoid()}`,
      dateKey,
      originDateKey: dateKey,
      kind: 'course',
      sourceId: lesson.id,
      lessonId: lesson.id,
      sourceText,
      stage,
      priority:
        (lesson.exercises.some((item) => item.source === 'imported') ? 10 : 0) + (stage === 'understand' ? 0 : 20),
      referenceAttemptId,
      dueAt,
      title: `${lesson.title} · ${label}`,
      titleZh: `${lesson.title} · ${labelZh}`,
      reason: supported
        ? 'Last recall needed support or another try. Start with one sentence; use a hint if needed and record the assistance.'
        : dueAt && dueAt > now
          ? 'Let the correction settle. This recall becomes available after the delay.'
          : reason,
      reasonZh: supported
        ? '上次回忆需要帮助或重试。这次先练一句，必要时使用提示并记录帮助情况。'
        : dueAt && dueAt > now
          ? '让修改后的内容沉淀一下，间隔结束后再回忆。'
          : reasonZh,
      href: `/learn/${encodeURIComponent(lesson.unitId)}?lesson=${encodeURIComponent(lesson.id)}&stage=${stage}`,
      minutes: supported ? 2 : Math.max(1, Math.min(duration, lesson.estimatedMinutes)),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      contentIds: lesson.exercises.map((item) => item.id),
    };
  });
}
