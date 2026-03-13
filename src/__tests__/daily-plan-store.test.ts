import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Browser environment mock ───────────────────────────────────────────────

const store = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (index: number) => [...store.keys()][index] ?? null,
};

vi.stubGlobal('localStorage', localStorageMock);
// The store checks `typeof window === 'undefined'` to guard SSR.
// Stub window so the guards pass in Node.js test environment.
vi.stubGlobal('window', globalThis);

vi.stubGlobal('localStorage', localStorageMock);

// We need to dynamically import the store AFTER the global is stubbed
// so that `loadFromStorage` picks up our mock.
const { useDailyPlanStore, todayKey } = await import('@/stores/daily-plan-store');
type PlanTask = import('@/stores/daily-plan-store').PlanTask;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTasks(count: number): PlanTask[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    type: 'new-words' as const,
    title: `Task ${i}`,
    description: `Description ${i}`,
    module: 'write' as const,
    completed: false,
    skipped: false,
  }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('daily-plan-store', () => {
  beforeEach(() => {
    store.clear();
    // Reset store to defaults
    useDailyPlanStore.setState({
      goal: { wordsPerDay: 20, sessionsPerDay: 4 },
      tasks: [],
      dateKey: '',
      dataSignature: '',
      levelKey: '',
      streak: 0,
      lastActiveDate: '',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── todayKey ──────────────────────────────────────────────────────────────

  describe('todayKey()', () => {
    it('returns a YYYY-MM-DD string for today', () => {
      const key = todayKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`;
      expect(key).toBe(expected);
    });

    it('uses the local calendar date instead of UTC midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-12T00:30:00+08:00'));

      expect(todayKey()).toBe('2026-03-12');

      vi.useRealTimers();
    });
  });

  // ── Default state ─────────────────────────────────────────────────────────

  describe('default state', () => {
    it('has correct defaults', () => {
      const s = useDailyPlanStore.getState();
      expect(s.goal).toEqual({ wordsPerDay: 20, sessionsPerDay: 4 });
      expect(s.tasks).toEqual([]);
      expect(s.dateKey).toBe('');
      expect(s.dataSignature).toBe('');
      expect(s.levelKey).toBe('');
      expect(s.streak).toBe(0);
      expect(s.lastActiveDate).toBe('');
    });
  });

  // ── setGoal ───────────────────────────────────────────────────────────────

  describe('setGoal', () => {
    it('updates wordsPerDay', () => {
      useDailyPlanStore.getState().setGoal({ wordsPerDay: 50 });
      expect(useDailyPlanStore.getState().goal.wordsPerDay).toBe(50);
      expect(useDailyPlanStore.getState().goal.sessionsPerDay).toBe(4);
    });

    it('updates sessionsPerDay', () => {
      useDailyPlanStore.getState().setGoal({ sessionsPerDay: 5 });
      expect(useDailyPlanStore.getState().goal.sessionsPerDay).toBe(5);
      expect(useDailyPlanStore.getState().goal.wordsPerDay).toBe(20);
    });

    it('partially merges the goal', () => {
      useDailyPlanStore.getState().setGoal({ wordsPerDay: 30 });
      useDailyPlanStore.getState().setGoal({ sessionsPerDay: 8 });
      expect(useDailyPlanStore.getState().goal).toEqual({
        wordsPerDay: 30,
        sessionsPerDay: 8,
      });
    });

    it('persists to localStorage', () => {
      useDailyPlanStore.getState().setGoal({ wordsPerDay: 10 });
      const raw = store.get('echotype_daily_plan');
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(parsed.goal.wordsPerDay).toBe(10);
    });
  });

  // ── setTasks ──────────────────────────────────────────────────────────────

  describe('setTasks', () => {
    it('sets tasks and updates dateKey to today', () => {
      const tasks = makeTasks(3);
      useDailyPlanStore.getState().setTasks(tasks);
      expect(useDailyPlanStore.getState().tasks).toHaveLength(3);
      expect(useDailyPlanStore.getState().dateKey).toBe(todayKey());
    });

    it('stores a data signature when provided', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(1), '361:0:0');
      expect(useDailyPlanStore.getState().dataSignature).toBe('361:0:0');
    });

    it('stores the assessment level when provided', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(1), '361:0:0', 'B2');
      expect(useDailyPlanStore.getState().levelKey).toBe('B2');
    });

    it('replaces previous tasks entirely', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      expect(useDailyPlanStore.getState().tasks).toHaveLength(2);

      useDailyPlanStore.getState().setTasks(makeTasks(4));
      expect(useDailyPlanStore.getState().tasks).toHaveLength(4);
    });

    it('persists to localStorage', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      const raw = store.get('echotype_daily_plan');
      const parsed = JSON.parse(raw!);
      expect(parsed.tasks).toHaveLength(2);
      expect(parsed.dateKey).toBe(todayKey());
    });
  });

  // ── completeTask ──────────────────────────────────────────────────────────

  describe('completeTask', () => {
    it('marks the target task as completed', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(3));
      useDailyPlanStore.getState().completeTask('task-1');
      const t = useDailyPlanStore.getState().tasks.find((t) => t.id === 'task-1');
      expect(t?.completed).toBe(true);
    });

    it('does not affect other tasks', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(3));
      useDailyPlanStore.getState().completeTask('task-1');
      const others = useDailyPlanStore.getState().tasks.filter((t) => t.id !== 'task-1');
      for (const t of others) {
        expect(t.completed).toBe(false);
      }
    });

    it('is idempotent for already-completed tasks', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(1));
      useDailyPlanStore.getState().completeTask('task-0');
      useDailyPlanStore.getState().completeTask('task-0');
      expect(useDailyPlanStore.getState().tasks[0].completed).toBe(true);
    });

    it('no-ops gracefully when taskId does not exist', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      useDailyPlanStore.getState().completeTask('nonexistent');
      expect(useDailyPlanStore.getState().tasks.every((t) => !t.completed)).toBe(true);
    });

    it('persists to localStorage', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      useDailyPlanStore.getState().completeTask('task-0');
      const raw = store.get('echotype_daily_plan');
      const parsed = JSON.parse(raw!);
      expect(parsed.tasks[0].completed).toBe(true);
    });
  });

  // ── skipTask ──────────────────────────────────────────────────────────────

  describe('skipTask', () => {
    it('marks the target task as skipped', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(3));
      useDailyPlanStore.getState().skipTask('task-2');
      const t = useDailyPlanStore.getState().tasks.find((t) => t.id === 'task-2');
      expect(t?.skipped).toBe(true);
    });

    it('does not affect other tasks', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(3));
      useDailyPlanStore.getState().skipTask('task-0');
      const others = useDailyPlanStore.getState().tasks.filter((t) => t.id !== 'task-0');
      for (const t of others) {
        expect(t.skipped).toBe(false);
      }
    });

    it('persists to localStorage', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      useDailyPlanStore.getState().skipTask('task-1');
      const raw = store.get('echotype_daily_plan');
      const parsed = JSON.parse(raw!);
      expect(parsed.tasks[1].skipped).toBe(true);
    });
  });

  // ── updateStreak ──────────────────────────────────────────────────────────

  describe('updateStreak', () => {
    it('starts streak at 1 for first activity', () => {
      useDailyPlanStore.getState().updateStreak();
      expect(useDailyPlanStore.getState().streak).toBe(1);
      expect(useDailyPlanStore.getState().lastActiveDate).toBe(todayKey());
    });

    it('increments streak when lastActiveDate is yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(
        yesterday.getDate(),
      ).padStart(2, '0')}`;

      useDailyPlanStore.setState({ streak: 5, lastActiveDate: yesterdayStr });
      useDailyPlanStore.getState().updateStreak();
      expect(useDailyPlanStore.getState().streak).toBe(6);
    });

    it('resets streak to 1 when there is a gap', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(
        twoDaysAgo.getDate(),
      ).padStart(2, '0')}`;

      useDailyPlanStore.setState({ streak: 10, lastActiveDate: twoDaysAgoStr });
      useDailyPlanStore.getState().updateStreak();
      expect(useDailyPlanStore.getState().streak).toBe(1);
    });

    it('is idempotent within the same day', () => {
      useDailyPlanStore.getState().updateStreak();
      expect(useDailyPlanStore.getState().streak).toBe(1);

      useDailyPlanStore.getState().updateStreak();
      expect(useDailyPlanStore.getState().streak).toBe(1);
    });

    it('persists to localStorage', () => {
      useDailyPlanStore.getState().updateStreak();
      const raw = store.get('echotype_daily_plan');
      const parsed = JSON.parse(raw!);
      expect(parsed.streak).toBe(1);
      expect(parsed.lastActiveDate).toBe(todayKey());
    });
  });

  // ── hydrate ───────────────────────────────────────────────────────────────

  describe('hydrate', () => {
    it('restores state from localStorage', () => {
      const saved = {
        goal: { wordsPerDay: 50, sessionsPerDay: 5 },
        tasks: makeTasks(2),
        dateKey: '2025-01-15',
        dataSignature: '10:2:1',
        levelKey: 'B1',
        streak: 7,
        lastActiveDate: '2025-01-14',
      };
      store.set('echotype_daily_plan', JSON.stringify(saved));

      useDailyPlanStore.getState().hydrate();
      const s = useDailyPlanStore.getState();
      expect(s.goal.wordsPerDay).toBe(50);
      expect(s.streak).toBe(7);
      expect(s.tasks).toHaveLength(2);
      expect(s.dateKey).toBe('2025-01-15');
      expect(s.dataSignature).toBe('10:2:1');
      expect(s.levelKey).toBe('B1');
    });

    it('does nothing when localStorage is empty', () => {
      useDailyPlanStore.getState().hydrate();
      const s = useDailyPlanStore.getState();
      expect(s.goal).toEqual({ wordsPerDay: 20, sessionsPerDay: 4 });
      expect(s.tasks).toEqual([]);
    });

    it('handles corrupted localStorage gracefully', () => {
      store.set('echotype_daily_plan', 'not-json');
      useDailyPlanStore.getState().hydrate();
      // Should not throw, stays at defaults
      expect(useDailyPlanStore.getState().goal.wordsPerDay).toBe(20);
    });

    it('partially merges (missing keys use existing defaults)', () => {
      store.set('echotype_daily_plan', JSON.stringify({ streak: 3 }));
      useDailyPlanStore.getState().hydrate();
      expect(useDailyPlanStore.getState().streak).toBe(3);
      // Other fields remain at defaults
      expect(useDailyPlanStore.getState().goal.wordsPerDay).toBe(20);
      expect(useDailyPlanStore.getState().goal.sessionsPerDay).toBe(4);
    });

    it('fills in the default goal when persisted state has no goal', () => {
      store.set(
        'echotype_daily_plan',
        JSON.stringify({
          tasks: makeTasks(1),
          streak: 2,
        }),
      );

      useDailyPlanStore.getState().hydrate();

      expect(useDailyPlanStore.getState().goal).toEqual({ wordsPerDay: 20, sessionsPerDay: 4 });
      expect(useDailyPlanStore.getState().tasks).toHaveLength(1);
      expect(useDailyPlanStore.getState().streak).toBe(2);
    });

    it('fills in default sessionsPerDay when persisted goal is partial', () => {
      store.set(
        'echotype_daily_plan',
        JSON.stringify({
          goal: { wordsPerDay: 30 },
        }),
      );

      useDailyPlanStore.getState().hydrate();

      expect(useDailyPlanStore.getState().goal).toEqual({ wordsPerDay: 30, sessionsPerDay: 4 });
    });
  });

  // ── Combined flows ────────────────────────────────────────────────────────

  describe('combined flows', () => {
    it('complete task then update streak works together', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(2));
      useDailyPlanStore.getState().completeTask('task-0');
      useDailyPlanStore.getState().updateStreak();

      const s = useDailyPlanStore.getState();
      expect(s.tasks[0].completed).toBe(true);
      expect(s.streak).toBe(1);
      expect(s.lastActiveDate).toBe(todayKey());
    });

    it('round-trip: set tasks → complete → persist → hydrate', () => {
      useDailyPlanStore.getState().setTasks(makeTasks(3));
      useDailyPlanStore.getState().completeTask('task-1');
      useDailyPlanStore.getState().skipTask('task-2');

      // Reset store (simulating page reload)
      useDailyPlanStore.setState({
        goal: { wordsPerDay: 20, sessionsPerDay: 4 },
        tasks: [],
        dateKey: '',
        dataSignature: '',
        levelKey: '',
        streak: 0,
        lastActiveDate: '',
      });

      // Hydrate from localStorage
      useDailyPlanStore.getState().hydrate();
      const s = useDailyPlanStore.getState();
      expect(s.tasks).toHaveLength(3);
      expect(s.tasks[1].completed).toBe(true);
      expect(s.tasks[2].skipped).toBe(true);
    });
  });
});
