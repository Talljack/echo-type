import { describe, expect, it } from 'vitest';
import { createLearningAttempt } from './learning-activity';
import { buildTextCourseTasks } from './text-daily-tasks';
import { applyDailyEvidence, reconcileDailyTasks, selectBudgetTasks } from './daily-task-planner';
import type { Lesson } from '@/types/learning-unit';

const day = 86_400_000;
const now = new Date(2026, 8, 12, 12).getTime();
const source = 'We fixed the API by working together.';
const lesson: Lesson = { id: 'l', unitId: 'u', title: 'Working together', order: 0, estimatedMinutes: 10, modules: ['write'], exercises: [{ id: 'c', title: 'Source', text: source, type: 'article', source: 'imported', tags: [], createdAt: 1, updatedAt: 1 }] };
const base = { lessonId: 'l', unitId: 'u', sourceText: source, sourceContentIds: ['c'] };
const understand = createLearningAttempt({ ...base, activity: 'comprehension', answer: 'The team solved a technical issue.', evidenceQuote: 'fixed the API' }, now - 100);
const output = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fix an API together yesterday.' }, now - 90);
const correct = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fixed an API together yesterday.', parentAttemptId: output.id, notes: 'Changed present tense to past tense.' }, now - 80);
const initial = [understand, output, correct];

describe('adaptive text course tasks', () => {
  it('keeps imported material ahead of untouched builtin courses after IndexedDB key sorting', () => {
    const builtin: Lesson = { ...lesson, id: 'a-builtin', exercises: lesson.exercises.map(item => ({ ...item, source: 'builtin' })) };
    const imported: Lesson = { ...lesson, id: 'z-imported' };
    const stored = buildTextCourseTasks([imported, builtin], [], now).sort((a, b) => a.id.localeCompare(b.id));
    expect(selectBudgetTasks(stored, 4, now)[0].lessonId).toBe('z-imported');
  });
  it('restores a paused transfer when a temporary due recall has been practiced', () => {
    const recall = createLearningAttempt({ ...base, activity: 'writing', answer: 'The team fixed the API.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good' } }, now + day);
    const attempts = [...initial, recall];
    const paused = { ...buildTextCourseTasks([lesson], attempts, recall.createdAt + 1)[0], status: 'paused' as const, startedAt: recall.createdAt + 1, minutes: 2 };
    const reviewTime = recall.createdAt + 3 * day;
    const due = reconcileDailyTasks([paused], buildTextCourseTasks([lesson], attempts, reviewTime), paused.dateKey, reviewTime);
    const nextRecall = createLearningAttempt({ ...base, activity: 'writing', answer: 'The team fixed the API.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good' } }, reviewTime);
    const candidates = buildTextCourseTasks([lesson], [...attempts, nextRecall], reviewTime + 1);
    const restored = reconcileDailyTasks(due, candidates, candidates[0].dateKey, reviewTime + 1).filter(task => !task.superseded && task.stage === 'apply');
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ id: paused.id, status: 'paused', startedAt: paused.startedAt, minutes: 2 });
  });
  it('targets source-backed understanding first and advances to original writing', () => {
    const first = buildTextCourseTasks([lesson], [], now)[0];
    expect(first.stage).toBe('understand');
    expect(first.href).toContain('stage=understand');
    expect(buildTextCourseTasks([lesson], [understand], now)[0]).toMatchObject({ stage: 'output', referenceAttemptId: understand.id });
  });
  it('schedules delayed recall outside the current budget', () => {
    const tasks = buildTextCourseTasks([lesson], initial, now);
    expect(tasks[0]).toMatchObject({ stage: 'recall', referenceAttemptId: correct.id, dueAt: correct.createdAt + day });
    expect(selectBudgetTasks(tasks, 20, now)).toEqual([]);
    expect(selectBudgetTasks(tasks, 20, now + day)[0].stage).toBe('recall');
  });
  it('completes exact correction evidence before superseding the old recommendation', () => {
    const pending = buildTextCourseTasks([lesson], [understand, output], now - 85);
    const credited = applyDailyEvidence(pending, { attempts: initial }, now);
    expect(credited[0].evidenceIds).toEqual([`attempt:${correct.id}`]);
    const tasks = reconcileDailyTasks(credited, buildTextCourseTasks([lesson], initial, now), pending[0].dateKey, now);
    expect(tasks.filter(task => task.status === 'completed')).toHaveLength(1);
    expect(tasks.filter(task => task.stage === 'recall')).toHaveLength(1);
  });
  it('recommends a shorter supported retry after assisted recall and credits practice honestly', () => {
    const due = now + day;
    const tasks = buildTextCourseTasks([lesson], initial, due);
    const recall = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fixed an API together yesterday.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good', assisted: true } }, due + 1);
    expect(applyDailyEvidence(tasks, { attempts: [...initial, recall] }, due + 2)[0].status).toBe('completed');
    const retry = buildTextCourseTasks([lesson], [...initial, recall], due + 2)[0];
    expect(retry.stage).toBe('recall');
    expect(retry.minutes).toBeLessThan(tasks[0].minutes);
    expect(retry.reason).toMatch(/support|hint|assisted/i);
    expect(retry.dueAt).toBe(recall.createdAt + 600_000);
  });
  it('successful retrieval opens a specific transfer task, not another generic lesson', () => {
    const recall = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fixed an API together yesterday.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good' } }, now + day);
    const tasks = buildTextCourseTasks([lesson], [...initial, recall], now + day + 1);
    expect(tasks[0]).toMatchObject({ stage: 'apply', referenceAttemptId: correct.id });
    expect(tasks[0].href).toContain('stage=apply');
  });
  it('requires transfer evidence from the exact corrected source and a different context', () => {
    const recall = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fixed an API together yesterday.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good' } }, now + day);
    const attempts = [...initial, recall];
    const tasks = buildTextCourseTasks([lesson], attempts, now + day + 1);
    const unrelated = createLearningAttempt({ ...base, activity: 'personal-example', answer: 'We enjoy working together in our community garden.' }, now + day + 2);
    expect(applyDailyEvidence(tasks, { attempts: [...attempts, unrelated] }, now + day + 3)[0].status).toBe('pending');
    const transfer = createLearningAttempt({ ...base, activity: 'personal-example', answer: 'We enjoy working together in our community garden.', cycle: { stage: 'apply', referenceAttemptId: correct.id, expression: 'working together', context: 'community gardening' } }, now + day + 4);
    expect(applyDailyEvidence(tasks, { attempts: [...attempts, transfer] }, now + day + 5)[0].evidenceIds).toEqual([`attempt:${transfer.id}`]);
  });
  it('keeps just one paused target when regenerating candidates on a later day', () => {
    const previous = buildTextCourseTasks([lesson], [understand], now)[0];
    const paused = { ...previous, status: 'paused' as const, startedAt: now, minutes: 2 };
    const next = buildTextCourseTasks([lesson], [understand], now + day);
    const rows = reconcileDailyTasks([paused], next, next[0].dateKey, now + day);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: paused.id, status: 'paused', minutes: 2 });
  });
  it('does not attribute a later recall to an obsolete recall interval', () => {
    const due = now + day;
    const first = createLearningAttempt({ ...base, activity: 'writing', answer: 'I needed to look again.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'again' } }, due);
    const second = createLearningAttempt({ ...base, activity: 'writing', answer: 'We fixed the API together.', cycle: { stage: 'recall', referenceAttemptId: correct.id, rating: 'good' } }, due + 600_000);
    const obsolete = { ...buildTextCourseTasks([lesson], initial, due)[0], createdAt: due + 1 };
    expect(applyDailyEvidence([obsolete], { attempts: [...initial, first, second] }, second.createdAt)[0].status).toBe('pending');
  });
});
