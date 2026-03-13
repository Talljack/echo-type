import { nanoid } from 'nanoid';
import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import type { PlanTask } from '@/stores/daily-plan-store';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

const DAY_MS = 24 * 60 * 60 * 1000;

interface SyncContext {
  contents: ContentItem[];
  records: LearningRecord[];
  sessions: TypingSession[];
  dayKey?: string;
}

function contentById(contents: ContentItem[]): Map<string, ContentItem> {
  return new Map(contents.map((content) => [content.id, content]));
}

function isPracticedOnDay(timestamp: number | undefined, dayKey: string): boolean {
  return typeof timestamp === 'number' && toLocalDateKey(timestamp) === dayKey;
}

function matchesBookTask(
  task: PlanTask,
  record: LearningRecord | undefined,
  session: TypingSession | undefined,
  contents: Map<string, ContentItem>,
) {
  if (!task.bookId) return false;

  const relatedContentId = record?.contentId ?? session?.contentId;
  if (!relatedContentId) return false;

  const content = contents.get(relatedContentId);
  return content?.category === task.bookId;
}

function matchesTask(
  task: PlanTask,
  contents: Map<string, ContentItem>,
  records: LearningRecord[],
  sessions: TypingSession[],
  dayKey: string,
) {
  const matchesTarget = (record: LearningRecord | undefined, session: TypingSession | undefined) => {
    if (task.bookId) {
      return matchesBookTask(task, record, session, contents);
    }

    const relatedContentId = record?.contentId ?? session?.contentId;
    return task.contentId ? relatedContentId === task.contentId : false;
  };

  const sameDayRecords = records.filter((record) => isPracticedOnDay(record.lastPracticed, dayKey));
  const sameDaySessions = sessions.filter((session) => isPracticedOnDay(session.endTime ?? session.startTime, dayKey));

  return (
    sameDayRecords.some((record) => {
      return matchesTarget(record, undefined) && record.module === task.module;
    }) ||
    sameDaySessions.some((session) => {
      return matchesTarget(undefined, session) && session.module === task.module;
    })
  );
}

export function syncPlanTasks(tasks: PlanTask[], context: SyncContext): PlanTask[] {
  const dayKey = context.dayKey ?? toLocalDateKey();
  const contents = contentById(context.contents);

  return tasks.map((task) => {
    if (task.completed || task.skipped) return task;
    if (!task.contentId && !task.bookId) return task;

    return matchesTask(task, contents, context.records, context.sessions, dayKey) ? { ...task, completed: true } : task;
  });
}

export async function syncPlanTasksWithActivity(tasks: PlanTask[]): Promise<PlanTask[]> {
  if (tasks.length === 0) return tasks;

  const [contents, records, sessions] = await Promise.all([
    db.contents.toArray(),
    db.records.toArray(),
    db.sessions.toArray(),
  ]);

  return syncPlanTasks(tasks, { contents, records, sessions });
}

function nextReviewDelayDays(module: LearningRecord['module'], accuracy: number, attempts: number): number {
  if (module === 'listen') return Math.max(2, attempts);
  if (accuracy >= 95) return Math.min(14, 4 * attempts);
  if (accuracy >= 80) return Math.min(10, 2 * attempts);
  if (accuracy >= 60) return Math.min(5, attempts);
  return 1;
}

export async function savePracticeSession(
  session: TypingSession,
  options?: { mistakes?: LearningRecord['mistakes'] },
): Promise<void> {
  await db.sessions.add(session);

  const existingRecords = await db.records.where('contentId').equals(session.contentId).toArray();
  const existingRecord = existingRecords.find((record) => record.module === session.module);
  const attempts = (existingRecord?.attempts ?? 0) + 1;
  const effectiveAccuracy =
    session.module === 'listen' && session.correctChars === 0 && session.wrongChars === 0 ? 100 : session.accuracy;
  const correctCount =
    session.module === 'listen' && session.correctChars === 0 && session.wrongChars === 0
      ? session.totalWords
      : session.correctChars;
  const practicedAt = session.endTime ?? session.startTime;
  const nextReview = practicedAt + nextReviewDelayDays(session.module, effectiveAccuracy, attempts) * DAY_MS;

  await db.records.put({
    id: existingRecord?.id ?? nanoid(),
    contentId: session.contentId,
    module: session.module,
    attempts,
    correctCount: (existingRecord?.correctCount ?? 0) + correctCount,
    accuracy: effectiveAccuracy,
    wpm: session.module === 'write' ? session.wpm : existingRecord?.wpm,
    lastPracticed: practicedAt,
    nextReview,
    mistakes: options?.mistakes ?? existingRecord?.mistakes ?? [],
  });
}
