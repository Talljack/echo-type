import { nanoid } from 'nanoid';
import { toLocalDateKey } from '@/lib/date-key';
import { db } from '@/lib/db';
import { accuracyToRating, gradeCard } from '@/lib/fsrs';
import type { PlanTask } from '@/stores/daily-plan-store';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

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

function matchesTask(
  task: PlanTask,
  contents: Map<string, ContentItem>,
  records: LearningRecord[],
  sessions: TypingSession[],
  dayKey: string,
) {
  const sameDayRecords = records.filter((record) => isPracticedOnDay(record.lastPracticed, dayKey));
  const sameDaySessions = sessions.filter((session) => isPracticedOnDay(session.endTime ?? session.startTime, dayKey));

  if (task.bookId) {
    // For book-based tasks, count unique items practiced today
    const practicedIds = new Set<string>();

    for (const record of sameDayRecords) {
      if (record.module !== task.module) continue;
      const content = contents.get(record.contentId);
      if (content?.category === task.bookId) {
        practicedIds.add(record.contentId);
      }
    }
    for (const session of sameDaySessions) {
      if (session.module !== task.module) continue;
      const content = contents.get(session.contentId);
      if (content?.category === task.bookId) {
        practicedIds.add(session.contentId);
      }
    }

    // If task has a limit, require that many unique items; otherwise any match
    const requiredCount = task.limit ?? 1;
    return practicedIds.size >= requiredCount;
  }

  // For content-based tasks, any matching record/session is enough
  return (
    sameDayRecords.some((record) => record.contentId === task.contentId && record.module === task.module) ||
    sameDaySessions.some((session) => session.contentId === task.contentId && session.module === task.module)
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

  // Use FSRS for scheduling
  const rating = accuracyToRating(effectiveAccuracy);
  const { cardData, nextReview } = gradeCard(existingRecord?.fsrsCard, rating, new Date(practicedAt));

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
    fsrsCard: cardData,
    mistakes: options?.mistakes ?? existingRecord?.mistakes ?? [],
  });
}

/**
 * Update a learning record's FSRS card with a manual rating override.
 * Called when the user clicks Again/Hard/Good/Easy buttons after a review.
 */
export async function updateRecordWithRating(
  recordId: string,
  rating: import('ts-fsrs').Rating,
  now: Date = new Date(),
): Promise<void> {
  const record = await db.records.get(recordId);
  if (!record) return;

  const { cardData, nextReview } = gradeCard(record.fsrsCard, rating, now);
  await db.records.update(recordId, { fsrsCard: cardData, nextReview });
}
