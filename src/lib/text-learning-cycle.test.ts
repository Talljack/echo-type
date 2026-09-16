import { describe, expect, it } from 'vitest';
import type { LearningAttempt } from '@/types/learning-activity';

import * as engine from './text-learning-cycle';
const DAY = 86_400_000;
const source = 'We made steady progress on the project.';
function attempt(id: string, activity: LearningAttempt['activity'], createdAt: number, extra: Partial<LearningAttempt> = {}): LearningAttempt {
  return { id, lessonId: 'lesson', unitId: 'unit', sourceText: source, sourceContentIds: ['source'], activity, answer: 'My original summary.', prompt: '', feedback: { source: 'self', notes: '', checklist: [] }, status: 'submitted', createdAt, updatedAt: createdAt, ...extra };
}
const understand = attempt('understand', 'comprehension', 1, { evidenceQuote: 'steady progress' });
const output = attempt('output', 'writing', 2);
const correction = attempt('correction', 'writing', 3, { parentAttemptId: 'output', answer: 'Our team advanced the project steadily.', feedback: { source: 'self', notes: 'Changed the subject to make the actor clear.', checklist: [] }, status: 'revised' });
const base = [understand, output, correction];
function recall(id: string, createdAt: number, extra: Partial<NonNullable<LearningAttempt['cycle']>> = {}) {
  return attempt(id, 'writing', createdAt, { cycle: { stage: 'recall', referenceAttemptId: correction.id, rating: 'good', ...extra } });
}
function derive(attempts = base, now = DAY + 3) {
  return engine.deriveTextCycle('lesson', source, attempts, now);
}
describe('text learning cycle evidence', () => {
  it('rejects transfer at the same timestamp as recall regardless of identifier order', () => {
    const good = recall('z-recall', DAY + 3);
    for (const id of ['a-apply', 'zz-apply']) {
      const transfer = attempt(id, 'personal-example', good.createdAt, { answer: 'I made steady progress learning the piano.', cycle: { stage: 'apply', referenceAttemptId: correction.id, expression: 'steady progress', context: 'Learning piano at home' } });
      expect(engine.validateTextCycleAttempt(transfer, [...base, good])).toBe('recall-first');
      expect(derive([...base, good, transfer], transfer.createdAt).stages.apply).toBe(false);
    }
  });
  it('does not traverse an invalid intermediate revision to credit a later correction', () => {
    const valid = { ...correction, id: 'valid', createdAt: 5 };
    const invalid = { ...correction, id: 'invalid', parentAttemptId: valid.id, createdAt: 4, answer: 'An impossible earlier revision.' };
    const final = { ...correction, id: 'final', parentAttemptId: invalid.id, createdAt: 6, answer: 'A later revision with invalid ancestry.' };
    const rows = [understand, output, valid, invalid, final];
    expect(engine.validateTextCorrection(invalid, rows)).toBe('reference');
    expect(derive(rows, 10).evidence.correct).toBe(valid.id);
  });
  it('does not credit a copied source excerpt as original writing', () => {
    expect(derive([understand, { ...output, answer: 'steady progress' }]).stages.output).toBe(false);
  });
  it('starts a fresh schedule for a corrected later original submission', () => {
    const secondOutput = { ...output, id: 'second-output', createdAt: 10 };
    const secondCorrection = { ...correction, id: 'second-correction', parentAttemptId: secondOutput.id, createdAt: 11 };
    expect(derive([...base, secondOutput, secondCorrection])).toMatchObject({ referenceAttemptId: secondCorrection.id, dueAt: DAY + 11, evidence: { output: secondOutput.id } });
  });
  it('keeps legacy work at three stages and schedules delayed retrieval', () => {
    expect(derive(base, 3)).toMatchObject({ completedSteps: 3, completed: false, nextStage: 'recall', dueAt: DAY + 3, reviewStatus: 'scheduled' });
    expect(derive().reviewStatus).toBe('due');
  });
  it('isolates lessons, exact source revisions and future evidence', () => {
    expect(derive(base.map((a) => ({ ...a, lessonId: 'other' }))).completedSteps).toBe(0);
    expect(derive(base.map((a) => ({ ...a, sourceText: `${source} changed` }))).completedSteps).toBe(0);
    expect(derive(base, 1).nextStage).toBe('output');
  });
  it('requires a real changed draft and identified improvement', () => {
    expect(derive([...base.slice(0, 2), { ...correction, answer: ` ${output.answer}  ` }]).stages.correct).toBe(false);
    expect(derive([...base.slice(0, 2), { ...correction, feedback: { ...correction.feedback, notes: '' } }]).stages.correct).toBe(false);
  });
  it('rejects immediate retrieval and accepts delayed honest self-rating', () => {
    expect(derive([...base, recall('early', 4)]).stages.recall).toBe(false);
    const good = recall('good', DAY + 3);
    expect(derive([...base, good])).toMatchObject({ nextStage: 'apply', stages: { recall: true }, dueAt: 4 * DAY + 3, evidence: { recall: 'good' } });
  });
  it('retains assisted and failed evidence but brings retrieval back sooner', () => {
    for (const extra of [{ assisted: true }, { sourceRevealed: true }, { rating: 'again' as const }]) {
      const review = recall('assisted', DAY + 3, extra);
      expect(derive([...base, review])).toMatchObject({ stages: { recall: false }, dueAt: DAY + 3 + 600_000, lastRecallAttemptId: 'assisted', lastRecallAssisted: !!(extra.assisted || extra.sourceRevealed) });
    }
  });
  it('increases spacing only for due unassisted successful reviews', () => {
    const good = recall('good', DAY + 3);
    const next = recall('next', 4 * DAY + 3);
    expect(derive([...base, good, next], next.createdAt).dueAt).toBe(10 * DAY + 3);
    expect(derive([...base, good, recall('early', DAY + 4)], DAY + 4).dueAt).toBe(4 * DAY + 3);
  });
  it('requires explicit expression and new context after successful recall', () => {
    const transfer = attempt('apply', 'personal-example', DAY + 4, { answer: 'I made steady progress learning the piano.', cycle: { stage: 'apply', referenceAttemptId: correction.id, expression: 'steady progress', context: 'Learning piano at home' } });
    expect(derive([...base, transfer], DAY + 4).stages.apply).toBe(false);
    expect(derive([...base, recall('good', DAY + 3), transfer], DAY + 4).completed).toBe(true);
    expect(derive([...base, recall('good', DAY + 3), { ...transfer, answer: source }], DAY + 4).stages.apply).toBe(false);
    expect(derive([...base, recall('good', DAY + 3), { ...transfer, cycle: undefined }], DAY + 4).stages.apply).toBe(false);
  });
  it('shares validation errors with submission controls', () => {
    derive();
    expect(engine!.validateTextCycleAttempt(recall('early', 4), base)).toBe('not-due');
    expect(engine!.validateTextCorrection({ ...correction, answer: output.answer }, base)).toBe('unchanged');
    expect(engine!.validateTextCycleAttempt(recall('valid', DAY + 3), base)).toBeNull();
  });
});
