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
