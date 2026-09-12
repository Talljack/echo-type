import type { DailyTask } from '@/types/daily-task';
import { shiftLocalDateKey, toLocalDateKey } from './date-key';

export function remainingDailyMinutes(tasks: DailyTask[], date: string, budget: number) {
  const used = tasks
    .filter(
      (task) =>
        task.kind !== 'settings' &&
        task.status === 'completed' &&
        (task.completedAt === undefined ? task.dateKey : toLocalDateKey(task.completedAt)) === date,
    )
    .reduce((sum, task) => sum + Math.max(0, task.minutes), 0);
  return Math.max(0, budget - used);
}

export interface DailyEvidence {
  sessions?: {
    id: string;
    contentId: string;
    completed: boolean;
    startTime: number;
    endTime?: number;
    module?: string;
  }[];
  attempts?: {
    id: string;
    lessonId: string;
    createdAt: number;
    answer: string;
    status: string;
    sourceWeakSpotId?: string;
  }[];
  favorites?: { id: string; updatedAt?: number; fsrsCard?: { last_review?: number } }[];
  records?: { id: string; contentId: string; module: string; fsrsCard?: { last_review?: number } }[];
  weakSpots?: { id: string; resolved: boolean; lastSeenAt: number }[];
  pronunciation?: { id: string; updatedAt: number; kind: string }[];
}
export function selectBudgetTasks(tasks: DailyTask[], minutes: number): DailyTask[] {
  let remaining = Math.max(0, Math.min(120, Math.floor(minutes) || 0));
  const course = tasks.find((task) => task.kind === 'course');
  const review = tasks.find((task) => task.kind === 'review' || task.kind === 'favorite');
  const resumed = tasks.filter((task) => task.status === 'paused' || task.status === 'in-progress');
  const priority = [...new Set([...resumed, review, course, ...tasks])].filter((task): task is DailyTask => !!task);
  const result: DailyTask[] = [];
  for (const task of priority) {
    if (!remaining) break;
    // Reserve a short new-learning block even when many reviews are due.
    const reserve = task === review && course && remaining >= 3 ? Math.min(3, remaining - 1) : 0;
    const block = Math.min(Math.max(1, task.minutes), remaining - reserve);
    if (block <= 0) continue;
    result.push({ ...task, minutes: block });
    remaining -= block;
  }
  return result;
}

export function reconcileDailyTasks(
  saved: DailyTask[],
  candidates: DailyTask[],
  dateKey: string,
  now: number,
): DailyTask[] {
  const result = saved.map((task) => {
    if (task.kind === 'settings' || task.dateKey > dateKey || task.status === 'completed' || task.status === 'skipped')
      return task;
    if (task.status === 'pending' && !task.startedAt && task.originDateKey < shiftLocalDateKey(-1, now)) return task;
    if (task.dateKey === dateKey && task.status !== 'deferred') return task;
    return {
      ...task,
      dateKey,
      status: task.status === 'deferred' ? ('pending' as const) : task.status,
      updatedAt: now,
    };
  });
  const keys = new Set(
    result
      .filter((task) => task.kind !== 'settings' && task.dateKey >= dateKey)
      .map((task) => `${task.kind}:${task.sourceId}`),
  );
  const ids = new Set(result.map((task) => task.id));
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.sourceId}`;
    if (!keys.has(key) && !ids.has(candidate.id)) {
      result.push(candidate);
      keys.add(key);
      ids.add(candidate.id);
    }
  }
  return result;
}

export function transitionDailyTask(
  task: DailyTask,
  action: 'start' | 'pause' | 'skip' | 'defer' | 'restore',
  now: number,
): DailyTask {
  if (task.status === 'completed' || task.kind === 'settings') return task;
  const status = {
    start: 'in-progress',
    pause: 'paused',
    skip: 'skipped',
    defer: 'deferred',
    restore: 'pending',
  } as const;
  return {
    ...task,
    status: status[action],
    updatedAt: now,
    ...(action === 'start' ? { startedAt: task.startedAt ?? now } : {}),
    ...(action === 'defer' ? { dateKey: shiftLocalDateKey(1, now) } : {}),
    ...(action === 'restore' ? { dateKey: toLocalDateKey(now) } : {}),
  };
}

export function applyDailyEvidence(tasks: DailyTask[], evidence: DailyEvidence, now: number): DailyTask[] {
  const used = new Set(tasks.flatMap((task) => task.evidenceIds ?? []));
  const priority = [...tasks].sort(
    (a, b) =>
      Number(!!b.startedAt) - Number(!!a.startedAt) || Number(a.kind === 'course') - Number(b.kind === 'course'),
  );
  const updated = priority.map((task) => {
    if (task.kind === 'settings' || ['completed', 'skipped', 'deferred'].includes(task.status)) return task;
    const since = task.startedAt ?? task.createdAt;
    const fresh = (time: number | undefined): time is number =>
      typeof time === 'number' && time >= since && time <= now;
    const options: { id: string; time: number }[] = [];
    if (task.kind === 'course') {
      for (const attempt of evidence.attempts ?? []) {
        if (
          attempt.lessonId === task.lessonId &&
          ['submitted', 'revised'].includes(attempt.status) &&
          attempt.answer.trim() &&
          fresh(attempt.createdAt)
        )
          options.push({ id: `attempt:${attempt.id}`, time: attempt.createdAt });
      }
      for (const session of evidence.sessions ?? []) {
        const time = session.endTime ?? session.startTime;
        if (session.completed && task.contentIds?.includes(session.contentId) && fresh(time))
          options.push({ id: `session:${session.id}`, time });
      }
    }
    if (task.kind === 'review') {
      const record = evidence.records?.find((item) => item.id === task.sourceId);
      const time = record?.fsrsCard?.last_review;
      if (fresh(time)) {
        const session = evidence.sessions?.find(
          (item) =>
            item.completed &&
            item.contentId === record?.contentId &&
            item.module === record.module &&
            (item.endTime ?? item.startTime) === time,
        );
        options.push({ id: session ? `session:${session.id}` : `review:${task.sourceId}:${time}`, time });
      }
    }
    if (task.kind === 'favorite') {
      const time = evidence.favorites?.find((item) => item.id === task.sourceId)?.fsrsCard?.last_review;
      if (fresh(time)) options.push({ id: `favorite:${task.sourceId}:${time}`, time });
    }
    if (task.kind === 'pronunciation') {
      for (const item of evidence.pronunciation ?? []) {
        if (['recording', 'speechsuper'].includes(item.kind) && fresh(item.updatedAt))
          options.push({ id: `pronunciation:${item.id}`, time: item.updatedAt });
      }
    }
    // A weak-spot practice needs a saved linked submission, not a settings toggle.
    if (task.kind === 'weak-spot') {
      for (const attempt of evidence.attempts ?? []) {
        if (
          attempt.sourceWeakSpotId === task.sourceId &&
          ['submitted', 'revised'].includes(attempt.status) &&
          attempt.answer.trim() &&
          fresh(attempt.createdAt)
        )
          options.push({ id: `attempt:${attempt.id}`, time: attempt.createdAt });
      }
      for (const session of evidence.sessions ?? []) {
        const time = session.endTime ?? session.startTime;
        if (
          session.completed &&
          session.module === task.module &&
          task.contentIds?.includes(session.contentId) &&
          fresh(time)
        )
          options.push({ id: `session:${session.id}`, time });
      }
    }
    const match = options.sort((a, b) => a.time - b.time).find((item) => !used.has(item.id));
    if (!match) return task;
    used.add(match.id);
    return { ...task, status: 'completed' as const, completedAt: match.time, evidenceIds: [match.id], updatedAt: now };
  });
  const byId = new Map(updated.map((task) => [task.id, task]));
  return tasks.map((task) => byId.get(task.id) ?? task);
}
