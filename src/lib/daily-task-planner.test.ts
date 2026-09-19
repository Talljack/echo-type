import { describe, expect, it } from 'vitest';
import type { DailyTask } from '@/types/daily-task';
import { reconcileDailyTasks, selectBudgetTasks, transitionDailyTask, applyDailyEvidence, remainingDailyMinutes } from './daily-task-planner';

const now = new Date(2026, 8, 12, 12).getTime();
const date = '2026-09-12';
const task = (id: string, kind: DailyTask['kind'] = 'course'): DailyTask => ({
  id, kind, sourceId: id, dateKey: date, originDateKey: date,
  title: id, titleZh: id, reason: '', reasonZh: '', href: '/learn', minutes: 5,
  status: 'pending', createdAt: now - 100, updatedAt: now - 100, contentIds: ['c1'], lessonId: 'l1',
});

describe('daily task planner', () => {
  it('prioritizes due text recall over paused work and excludes future recall from budget', () => {
    const due = { ...task('due'), stage: 'recall' as const, dueAt: now - 1 };
    const future = { ...task('future'), stage: 'recall' as const, dueAt: now + 1 };
    const paused = { ...task('paused'), status: 'paused' as const };
    expect(selectBudgetTasks([future, paused, due], 5, now).map(row => row.id)).toEqual(['due']);
  });
  it('supersedes obsolete stage tasks without marking them achieved or allowing restore', () => {
    const old = { ...task('old'), stage: 'understand' as const, sourceText: 'A source.' };
    const next = { ...task('next'), stage: 'output' as const, sourceText: 'A source.' };
    const rows = reconcileDailyTasks([old], [next], date, now);
    expect(rows[0].superseded).toBe(true);
    expect(transitionDailyTask(rows[0], 'restore', now)).toEqual(rows[0]);
  });
  it('stage tasks reject legacy sessions and attempts from another source', () => {
    const row = { ...task('exact'), stage: 'understand' as const, sourceText: 'Expected source.' };
    const result = applyDailyEvidence([row], {
      sessions: [{ id: 's', contentId: 'c1', completed: true, startTime: now }],
      attempts: [{ id: 'wrong', lessonId: 'l1', createdAt: now, answer: 'An unrelated answer', status: 'submitted', sourceText: 'Other source.' }],
    }, now);
    expect(result[0].status).toBe('pending');
  });
  it('replaces legacy generic recommendations for lessons now using stage tasks', () => {
    const next = { ...task('next'), stage: 'output' as const, sourceText: 'A source.' };
    const rows = reconcileDailyTasks([task('legacy')], [next], date, now);
    expect(rows[0].superseded).toBe(true);
  });
  it('refreshes due reasons while preserving paused identity and allocated time', () => {
    const paused = { ...task('paused'), stage: 'recall' as const, sourceText: 'A source.', dueAt: now, status: 'paused' as const, startedAt: now - 20, minutes: 1, reason: 'Scheduled' };
    const candidate = { ...paused, id: 'new', minutes: 3, reason: 'Due now' };
    const rows = reconcileDailyTasks([paused], [candidate], date, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'paused', status: 'paused', minutes: 1, reason: 'Due now' });
  });
  it('assigns linked evidence to the started task before a generic pending course', () => {
    const weak = { ...task('weak', 'weak-spot'), startedAt: now, status: 'in-progress' as const };
    const result = applyDailyEvidence([task('course'), weak], { attempts: [{ id: 'linked', lessonId: 'l1', sourceWeakSpotId: 'weak', createdAt: now, answer: 'Example', status: 'submitted' }] }, now);
    expect(result[0].status).toBe('pending');
    expect(result[1].evidenceIds).toEqual(['attempt:linked']);
  });
  it('bounds recommendations to budget and retains a new-learning block with review backlog', () => {
    const tasks = [task('r1', 'review'), task('r2', 'review'), task('course'), task('weak', 'weak-spot')];
    const selected = selectBudgetTasks(tasks, 5);
    expect(selected.reduce((sum, row) => sum + row.minutes, 0)).toBeLessThanOrEqual(5);
    expect(selected.some(row => row.kind === 'course')).toBe(true);
    expect(selected.some(row => row.kind === 'review')).toBe(true);
  });
  it('balances a 20-minute plan across vocabulary, input, and output instead of filling it with due words', () => {
    const vocabulary = Array.from({ length: 8 }, (_, index) => ({
      ...task(`word-${index}`, 'review'),
      vocabularyMode: 'meaning' as const,
      module: 'write' as const,
      minutes: 2,
    }));
    const input = { ...task('reading'), module: 'read' as const, minutes: 4 };
    const output = { ...task('speaking'), module: 'speak' as const, minutes: 4 };
    const pronunciation = { ...task('pronunciation', 'pronunciation'), module: 'speak' as const, minutes: 3, priority: 10 };

    const selected = selectBudgetTasks([...vocabulary, input, output, pronunciation], 20, now);

    expect(selected.map((row) => row.id)).toContain('reading');
    expect(selected.map((row) => row.id)).toContain('speaking');
    expect(selected.map((row) => row.id)).toContain('pronunciation');
    expect(selected.filter((row) => row.vocabularyMode).reduce((sum, row) => sum + row.minutes, 0)).toBeLessThanOrEqual(4);
  });
  it('keeps all due reviews ahead of balanced new practice when the budget allows', () => {
    const dueReviews = Array.from({ length: 7 }, (_, index) => ({ ...task(`due-${index}`, 'review'), minutes: 2 }));
    const vocabulary = { ...task('word', 'course'), vocabularyMode: 'meaning' as const, minutes: 2 };
    const input = { ...task('reading'), module: 'read' as const, minutes: 4 };
    const output = { ...task('speaking'), module: 'speak' as const, minutes: 4 };

    const selected = selectBudgetTasks([...dueReviews, vocabulary, input, output], 20, now);

    expect(selected.filter((row) => row.kind === 'review').map((row) => row.id)).toEqual(
      dueReviews.map((row) => row.id),
    );
  });
  it('regeneration retains completed and skipped tasks without duplicates', () => {
    const saved = [{ ...task('same'), status: 'completed' as const, evidenceIds: ['s1'] }, { ...task('skip'), status: 'skipped' as const }];
    const result = reconcileDailyTasks(saved, [task('same'), task('skip')], date, now);
    expect(result).toHaveLength(2);
    expect(result.map(row => row.status)).toEqual(['completed', 'skipped']);
  });
  it('carries unfinished work without changing its identity or original date', () => {
    const previous = { ...task('old'), dateKey: '2026-09-11', originDateKey: '2026-09-11', status: 'paused' as const };
    const result = reconcileDailyTasks([previous], [task('new')], date, now);
    expect(result.find(row => row.id === 'old')).toMatchObject({ dateKey: date, originDateKey: '2026-09-11', status: 'paused' });
  });
  it('does not duplicate an active target under a new daily id', () => {
    const previous = { ...task('old'), sourceId: 'target', dateKey: '2026-09-11' };
    const result = reconcileDailyTasks([previous], [{ ...task('new'), sourceId: 'target' }], date, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('old');
  });
  it('defer changes schedule, not achievement; completed tasks cannot be undone by navigation', () => {
    expect(transitionDailyTask(task('a'), 'defer', now)).toMatchObject({ status: 'deferred', dateKey: '2026-09-13' });
    const completed = { ...task('a'), status: 'completed' as const };
    expect(transitionDailyTask(completed, 'start', now)).toEqual(completed);
  });
  it('navigation and incomplete sessions never count as completed', () => {
    const started = transitionDailyTask(task('a'), 'start', now);
    const result = applyDailyEvidence([started], { sessions: [{ id: 's1', contentId: 'c1', completed: false, startTime: now, endTime: now + 1 }] }, now + 2);
    expect(result[0].status).toBe('in-progress');
  });
  it('uses fresh completed session once and never retroactively counts old practice', () => {
    const tasks = [task('a'), task('b')];
    const result = applyDailyEvidence(tasks, { sessions: [
      { id: 'old', contentId: 'c1', completed: true, startTime: now - 500, endTime: now - 200 },
      { id: 'fresh', contentId: 'c1', completed: true, startTime: now, endTime: now + 1 },
    ] }, now + 2);
    expect(result.filter(row => row.status === 'completed')).toHaveLength(1);
    expect(result[0].evidenceIds).toEqual(['session:fresh']);
  });
  it('changing a favorite note is not review evidence', () => {
    const favorite = { ...task('f', 'favorite'), sourceId: 'f' };
    const unchanged = applyDailyEvidence([favorite], { favorites: [{ id: 'f', updatedAt: now + 1, fsrsCard: { last_review: now - 500 } }] }, now + 2);
    expect(unchanged[0].status).toBe('pending');
    const reviewed = applyDailyEvidence([favorite], { favorites: [{ id: 'f', fsrsCard: { last_review: now + 1 } }] }, now + 2);
    expect(reviewed[0].status).toBe('completed');
  });
  it('skipped/deferred tasks cannot consume completion evidence from unrelated work', () => {
    const skipped = { ...task('a'), status: 'skipped' as const };
    expect(applyDailyEvidence([skipped], { attempts: [{ id: 'x', lessonId: 'l1', createdAt: now, answer: 'answer', status: 'submitted' }] }, now)[0].status).toBe('skipped');
  });
  it('counts a linked transfer submission without treating an unrelated lesson as weak-spot practice', () => {
    const weak = task('weak', 'weak-spot');
    const result = applyDailyEvidence([weak], { attempts: [{ id: 'a', lessonId: 'l1', sourceWeakSpotId: 'weak', createdAt: now, answer: 'A new example', status: 'submitted' }] }, now);
    expect(result[0].evidenceIds).toEqual(['attempt:a']);
    expect(applyDailyEvidence([weak], { attempts: [{ id: 'a', lessonId: 'l1', createdAt: now, answer: 'A new example', status: 'submitted' }] }, now)[0].status).toBe('pending');
  });
  it('does not count the session and its matching review record twice', () => {
    const rows = [task('c'), { ...task('r', 'review'), sourceId: 'r' }];
    const result = applyDailyEvidence(rows, { sessions: [{ id: 's', contentId: 'c1', module: 'write', completed: true, startTime: now, endTime: now }], records: [{ id: 'r', contentId: 'c1', module: 'write', fsrsCard: { last_review: now } }] }, now);
    expect(result.filter(row => row.status === 'completed')).toHaveLength(1);
  });
  it('prioritizes a paused block when the budget shrinks', () => {
    const paused = { ...task('resume'), status: 'paused' as const };
    expect(selectBudgetTasks([task('r','review'), task('new'), paused], 5)[0].id).toBe('resume');
  });
  it('does not carry pending unstarted recommendations from every past day into an endless backlog', () => {
    const old = { ...task('old'), dateKey: '2026-09-01', originDateKey: '2026-09-01' };
    const result = reconcileDailyTasks([old], [task('new')], date, now);
    expect(result.find(row => row.id === 'old')?.dateKey).toBe('2026-09-01');
  });
  it('restoring an old skipped task schedules it today and keeps original date', () => {
    const skipped = { ...task('old'), status: 'skipped' as const, dateKey: '2026-09-01', originDateKey: '2026-09-01' };
    expect(transitionDailyTask(skipped, 'restore', now)).toMatchObject({ dateKey: date, originDateKey: '2026-09-01', status: 'pending' });
  });
  it('completed blocks consume the day budget across both course and review screens', () => {
    const done = { ...task('done'), minutes: 3, status: 'completed' as const, completedAt: now };
    expect(remainingDailyMinutes([done, task('pending'), { ...done, id: 'yesterday', completedAt: now - 86400000, dateKey: '2026-09-11' }], date, 5)).toBe(2);
    expect(remainingDailyMinutes([done], date, 2)).toBe(0);
  });
});
