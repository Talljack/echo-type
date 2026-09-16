import type { DailyTask } from '@/types/daily-task';
import type { LearningAttempt } from '@/types/learning-activity';
import { shiftLocalDateKey, toLocalDateKey } from './date-key';
import { deriveTextCycle } from './text-learning-cycle';

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
  attempts?: (Pick<LearningAttempt, 'id' | 'lessonId' | 'createdAt' | 'answer'> &
    Partial<Omit<LearningAttempt, 'status'>> & { status: string })[];
  favorites?: { id: string; updatedAt?: number; fsrsCard?: { last_review?: number } }[];
  records?: { id: string; contentId: string; module: string; fsrsCard?: { last_review?: number } }[];
  weakSpots?: { id: string; resolved: boolean; lastSeenAt: number }[];
  pronunciation?: { id: string; updatedAt: number; kind: string }[];
}
export function selectBudgetTasks(tasks: DailyTask[], minutes: number, now = Date.now()): DailyTask[] {
  tasks = tasks
    .filter((task) => !task.superseded && (task.dueAt === undefined || task.dueAt <= now))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  let remaining = Math.max(0, Math.min(120, Math.floor(minutes) || 0));
  const course =
    tasks.find((task) => task.kind === 'course' && !task.vocabularyMode) ??
    tasks.find((task) => task.kind === 'course');
  const review = tasks.find((task) => task.kind === 'review' || task.kind === 'favorite');
  const resumed = tasks.filter((task) => task.status === 'paused' || task.status === 'in-progress');
  const recall = tasks.filter((task) => task.stage === 'recall').sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
  const priority = [...new Set([...recall, ...resumed, review, course, ...tasks])].filter(
    (task): task is DailyTask => !!task,
  );
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
  const activeTargets = new Set(saved.filter((task) => !task.superseded).map(taskTargetKey));
  const result = saved.map((task) => {
    if (
      task.vocabularyMode &&
      task.status !== 'completed' &&
      !candidates.some((candidate) => taskTargetKey(candidate) === taskTargetKey(task))
    )
      return task.superseded ? task : { ...task, superseded: true, updatedAt: now };
    const targetKey = taskTargetKey(task);
    if (
      task.superseded &&
      (task.status === 'paused' ||
        task.status === 'in-progress' ||
        (!!task.vocabularyMode && task.status === 'pending')) &&
      !activeTargets.has(targetKey) &&
      candidates.some((candidate) => taskTargetKey(candidate) === targetKey)
    ) {
      task = { ...task, superseded: false, updatedAt: now };
      activeTargets.add(targetKey);
    }
    if (
      task.kind === 'course' &&
      !task.stage &&
      task.status !== 'completed' &&
      candidates.some((candidate) => candidate.stage && candidate.lessonId === task.lessonId)
    )
      return task.superseded ? task : { ...task, superseded: true, updatedAt: now };
    if (
      task.stage &&
      task.status !== 'completed' &&
      !candidates.some((candidate) => taskTargetKey(candidate) === taskTargetKey(task))
    )
      return task.superseded ? task : { ...task, superseded: true, updatedAt: now };
    if (task.stage && !task.superseded && task.status !== 'completed') {
      const candidate = candidates.find((candidate) => taskTargetKey(candidate) === taskTargetKey(task));
      if (
        candidate &&
        (candidate.reason !== task.reason || candidate.reasonZh !== task.reasonZh || candidate.title !== task.title)
      )
        task = {
          ...task,
          title: candidate.title,
          titleZh: candidate.titleZh,
          reason: candidate.reason,
          reasonZh: candidate.reasonZh,
          href: candidate.href,
          updatedAt: now,
        };
    }
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
      .filter((task) => !task.superseded)
      .map(taskTargetKey),
  );
  const ids = new Set(result.map((task) => task.id));
  for (const candidate of candidates) {
    const key = taskTargetKey(candidate);
    if (!keys.has(key) && !ids.has(candidate.id)) {
      result.push(candidate);
      keys.add(key);
      ids.add(candidate.id);
    }
  }
  return result;
}

function taskTargetKey(task: DailyTask) {
  return JSON.stringify([task.kind, task.sourceId, task.stage, task.sourceText, task.referenceAttemptId, task.dueAt]);
}

export function transitionDailyTask(
  task: DailyTask,
  action: 'start' | 'pause' | 'skip' | 'defer' | 'restore',
  now: number,
): DailyTask {
  if (task.status === 'completed' || task.kind === 'settings' || task.superseded) return task;
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
    if (task.kind === 'settings' || task.superseded || ['completed', 'skipped', 'deferred'].includes(task.status))
      return task;
    const since = task.startedAt ?? task.createdAt;
    const fresh = (time: number | undefined): time is number =>
      typeof time === 'number' && time >= since && time <= now;
    const options: { id: string; time: number }[] = [];
    if (task.kind === 'course' && task.stage && task.lessonId && task.sourceText) {
      const attempts = (evidence.attempts ?? []).filter(
        (attempt): attempt is LearningAttempt =>
          attempt.lessonId === task.lessonId &&
          attempt.sourceText === task.sourceText &&
          !!attempt.activity &&
          !!attempt.feedback &&
          ['submitted', 'revised'].includes(attempt.status),
      );
      for (const attempt of attempts) {
        if (!fresh(attempt.createdAt) || (task.dueAt !== undefined && attempt.createdAt < task.dueAt)) continue;
        if (
          task.stage === 'recall' &&
          deriveTextCycle(
            task.lessonId,
            task.sourceText,
            attempts.filter((item) => item.id !== attempt.id),
            attempt.createdAt,
          ).dueAt !== task.dueAt
        )
          continue;
        const cycle = deriveTextCycle(task.lessonId, task.sourceText, attempts, attempt.createdAt);
        const evidenceId = task.stage === 'recall' ? cycle.lastRecallAttemptId : cycle.evidence[task.stage];
        const reference =
          task.stage === 'output'
            ? cycle.evidence.understand
            : task.stage === 'correct'
              ? attempt.parentAttemptId
              : task.stage === 'recall' || task.stage === 'apply'
                ? attempt.cycle?.referenceAttemptId
                : undefined;
        if (evidenceId === attempt.id && reference === task.referenceAttemptId)
          options.push({ id: `attempt:${attempt.id}`, time: attempt.createdAt });
      }
    }
    if (task.vocabularyMode) {
      const record = evidence.records?.find((item) => item.id === task.sourceId);
      const time = record?.fsrsCard?.last_review;
      if (fresh(time) && time >= (task.dueAt ?? 0)) options.push({ id: `review:${task.sourceId}:${time}`, time });
    }
    if (task.kind === 'course' && !task.stage && !task.vocabularyMode) {
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
    if (task.kind === 'review' && !task.vocabularyMode) {
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
