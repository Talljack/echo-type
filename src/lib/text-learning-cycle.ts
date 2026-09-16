import type { LearningAttempt, RecallRating, TextCycleStage } from '@/types/learning-activity';

export const TEXT_CYCLE_INITIAL_DELAY = 86_400_000;
const RETRY_DELAY = 600_000;
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');
const comparable = (text: string) => normalize(text).toLowerCase();
const ratings: RecallRating[] = ['again', 'hard', 'good', 'easy'];

export interface TextCycleState {
  stages: Record<TextCycleStage, boolean>;
  nextStage: TextCycleStage;
  referenceAttemptId?: string;
  dueAt?: number;
  reviewStatus: 'not-ready' | 'scheduled' | 'due';
  evidence: Partial<Record<TextCycleStage, string>>;
  completedSteps: number;
  completed: boolean;
  lastRecallAttemptId?: string;
  lastRecallAssisted: boolean;
  lastRecallRating?: RecallRating;
}

export function validateTextCorrection(attempt: LearningAttempt, attempts: LearningAttempt[]): string | null {
  const parent = attempts.find((item) => item.id === attempt.parentAttemptId);
  if (
    !parent ||
    parent.cycle ||
    attempt.cycle ||
    parent.activity !== 'writing' ||
    attempt.activity !== 'writing' ||
    parent.lessonId !== attempt.lessonId ||
    parent.sourceText !== attempt.sourceText ||
    parent.createdAt > attempt.createdAt
  )
    return 'reference';
  if (!normalize(attempt.answer)) return 'answer';
  if (normalize(parent.answer) === normalize(attempt.answer)) return 'unchanged';
  if (!attempt.feedback.notes.trim()) return 'improvement';
  return null;
}

function transferError(attempt: LearningAttempt): string | null {
  const expression = comparable(attempt.cycle?.expression ?? '');
  const context = comparable(attempt.cycle?.context ?? '');
  const answer = comparable(attempt.answer);
  const source = comparable(attempt.sourceText);
  if (attempt.activity !== 'personal-example') return 'activity';
  if (!expression || !source.includes(expression) || !answer.includes(expression)) return 'expression';
  if (!context || source.includes(context) || context === answer) return 'context';
  if (!answer || source.includes(answer)) return 'new-answer';
  return null;
}

/** Derives practice evidence, not proficiency. Exact source snapshots isolate revisions. */
export function deriveTextCycle(
  lessonId: string,
  sourceText: string,
  attempts: LearningAttempt[],
  now: number,
): TextCycleState {
  const own = attempts
    .filter((a) => a.lessonId === lessonId && a.sourceText === sourceText && a.createdAt <= now)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const evidence: TextCycleState['evidence'] = {};
  const understanding = own.find(
    (a) =>
      !a.cycle &&
      a.activity === 'comprehension' &&
      normalize(a.answer) &&
      a.evidenceQuote?.trim() &&
      sourceText.includes(a.evidenceQuote.trim()),
  );
  if (understanding) evidence.understand = understanding.id;
  const outputs = understanding
    ? own.filter(
        (a) =>
          !a.cycle &&
          a.activity === 'writing' &&
          !a.parentAttemptId &&
          a.createdAt >= understanding.createdAt &&
          normalize(a.answer) &&
          !comparable(sourceText).includes(comparable(a.answer)),
      )
    : [];
  // A newer genuine correction starts its own recall schedule and reference chain.
  const correction = own
    .filter(
      (a) =>
        !validateTextCorrection(a, own) &&
        outputs.some((output) => a.createdAt >= output.createdAt && reachesOutput(a, output.id, own)),
    )
    .at(-1);
  const output = correction ? outputs.find((item) => reachesOutput(correction, item.id, own)) : outputs.at(-1);
  if (output) evidence.output = output.id;
  if (correction) evidence.correct = correction.id;
  let dueAt = correction ? correction.createdAt + TEXT_CYCLE_INITIAL_DELAY : undefined;
  let interval = TEXT_CYCLE_INITIAL_DELAY;
  let recallSucceeded = false;
  let successfulRecallAt: number | undefined;
  let successfulReviews = 0;
  let lastRecallAttemptId: string | undefined;
  let lastRecallAssisted = false;
  let lastRecallRating: RecallRating | undefined;
  if (correction)
    for (const attempt of own) {
      const cycle = attempt.cycle;
      if (
        !cycle ||
        cycle.referenceAttemptId !== correction.id ||
        attempt.createdAt <= correction.createdAt ||
        !normalize(attempt.answer)
      )
        continue;
      if (
        cycle.stage === 'recall' &&
        attempt.activity === 'writing' &&
        cycle.rating &&
        ratings.includes(cycle.rating) &&
        dueAt !== undefined &&
        attempt.createdAt >= dueAt
      ) {
        lastRecallAttemptId = attempt.id;
        lastRecallAssisted = !!(cycle.assisted || cycle.sourceRevealed || attempt.usedTranslation);
        lastRecallRating = cycle.rating;
        recallSucceeded = !lastRecallAssisted && cycle.rating !== 'again';
        if (recallSucceeded) {
          evidence.recall = attempt.id;
          successfulRecallAt = attempt.createdAt;
          const factor = cycle.rating === 'easy' ? 7 : cycle.rating === 'good' ? 3 : 1;
          interval = Math.min(
            90 * TEXT_CYCLE_INITIAL_DELAY,
            Math.max(factor * TEXT_CYCLE_INITIAL_DELAY, interval * (cycle.rating === 'hard' ? 1.2 : 2)),
          );
          // The first hard review is due in one day; later successes extend it.
          if (successfulReviews === 0) interval = factor * TEXT_CYCLE_INITIAL_DELAY;
          successfulReviews += 1;
        } else {
          successfulRecallAt = undefined;
          interval = TEXT_CYCLE_INITIAL_DELAY;
          successfulReviews = 0;
          delete evidence.recall;
          delete evidence.apply;
        }
        dueAt = attempt.createdAt + (recallSucceeded ? interval : RETRY_DELAY);
      } else if (
        cycle.stage === 'apply' &&
        recallSucceeded &&
        successfulRecallAt !== undefined &&
        attempt.createdAt > successfulRecallAt &&
        !transferError(attempt)
      )
        evidence.apply = attempt.id;
    }
  const stages = Object.fromEntries(
    (['understand', 'output', 'correct', 'recall', 'apply'] as TextCycleStage[]).map((stage) => [
      stage,
      !!evidence[stage],
    ]),
  ) as TextCycleState['stages'];
  const reviewStatus = dueAt === undefined ? 'not-ready' : dueAt <= now ? 'due' : 'scheduled';
  const nextStage =
    reviewStatus === 'due'
      ? 'recall'
      : ((Object.keys(stages) as TextCycleStage[]).find((stage) => !stages[stage]) ?? 'recall');
  const completedSteps = Object.values(stages).filter(Boolean).length;
  return {
    stages,
    nextStage,
    referenceAttemptId: correction?.id,
    dueAt,
    reviewStatus,
    evidence,
    completedSteps,
    completed: completedSteps === 5,
    lastRecallAttemptId,
    lastRecallAssisted,
    lastRecallRating,
  };
}

function reachesOutput(attempt: LearningAttempt, outputId: string, attempts: LearningAttempt[]): boolean {
  const seen = new Set<string>();
  let current = attempt;
  while (current.parentAttemptId && !seen.has(current.id)) {
    seen.add(current.id);
    if (validateTextCorrection(current, attempts)) return false;
    const parentId = current.parentAttemptId;
    if (parentId === outputId) return true;
    const parent = attempts.find((a) => a.id === parentId);
    if (!parent) return false;
    current = parent;
  }
  return false;
}

export function validateTextCycleAttempt(attempt: LearningAttempt, attempts: LearningAttempt[]): string | null {
  if (!attempt.cycle) return 'cycle';
  if (!normalize(attempt.answer)) return 'answer';
  const state = deriveTextCycle(
    attempt.lessonId,
    attempt.sourceText,
    attempts.filter((a) => a.id !== attempt.id),
    attempt.createdAt,
  );
  if (!state.referenceAttemptId || state.referenceAttemptId !== attempt.cycle.referenceAttemptId) return 'reference';
  if (attempt.cycle.stage === 'recall') {
    if (attempt.activity !== 'writing') return 'activity';
    if (!attempt.cycle.rating || !ratings.includes(attempt.cycle.rating)) return 'rating';
    if (state.dueAt === undefined || attempt.createdAt < state.dueAt) return 'not-due';
    return null;
  }
  if (attempt.cycle.stage !== 'apply') return 'stage';
  const recalled = attempts.find((item) => item.id === state.evidence.recall);
  if (!state.stages.recall || !recalled || attempt.createdAt <= recalled.createdAt) return 'recall-first';
  return transferError(attempt);
}
