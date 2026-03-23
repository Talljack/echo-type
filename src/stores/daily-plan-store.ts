import { create } from 'zustand';
import { shiftLocalDateKey, toLocalDateKey } from '@/lib/date-key';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DailyGoal {
  wordsPerDay: number;
  sessionsPerDay: number;
}

export interface PlanTask {
  id: string;
  type: 'review' | 'new-words' | 'article' | 'speak' | 'listen';
  title: string;
  description: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  contentId?: string;
  bookId?: string;
  limit?: number;
  completed: boolean;
  skipped: boolean;
}

interface DailyPlanSettings {
  goal: DailyGoal;
  tasks: PlanTask[];
  dateKey: string;
  dataSignature: string;
  levelKey: string;
  streak: number;
  lastActiveDate: string;
}

interface DailyPlanStore extends DailyPlanSettings {
  setGoal: (goal: Partial<DailyGoal>) => void;
  setTasks: (tasks: PlanTask[], dataSignature?: string, levelKey?: string) => void;
  setDateKey: (key: string) => void;
  completeTask: (taskId: string) => void;
  skipTask: (taskId: string) => void;
  updateStreak: () => void;
  hydrate: () => void;
}

// ─── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'echotype_daily_plan';

function normalizeSettings(saved: Partial<DailyPlanSettings>): Partial<DailyPlanSettings> {
  const goal = saved.goal
    ? {
        wordsPerDay: typeof saved.goal.wordsPerDay === 'number' ? saved.goal.wordsPerDay : defaults.goal.wordsPerDay,
        sessionsPerDay:
          typeof saved.goal.sessionsPerDay === 'number' ? saved.goal.sessionsPerDay : defaults.goal.sessionsPerDay,
      }
    : defaults.goal;

  return {
    ...saved,
    goal,
  };
}

function loadFromStorage(): Partial<DailyPlanSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(settings: DailyPlanSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function getSettings(state: DailyPlanStore): DailyPlanSettings {
  return {
    goal: state.goal,
    tasks: state.tasks,
    dateKey: state.dateKey,
    dataSignature: state.dataSignature,
    levelKey: state.levelKey,
    streak: state.streak,
    lastActiveDate: state.lastActiveDate,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function todayKey(): string {
  return toLocalDateKey();
}

function yesterdayKey(): string {
  return shiftLocalDateKey(-1);
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const defaults: DailyPlanSettings = {
  goal: { wordsPerDay: 20, sessionsPerDay: 4 },
  tasks: [],
  dateKey: '',
  dataSignature: '',
  levelKey: '',
  streak: 0,
  lastActiveDate: '',
};

export const useDailyPlanStore = create<DailyPlanStore>((set, get) => ({
  ...defaults,

  setGoal: (partial) => {
    const state = get();
    const goal = { ...state.goal, ...partial };
    set({ goal });
    saveToStorage(getSettings({ ...state, goal }));
  },

  setTasks: (tasks, dataSignature, levelKey) => {
    const state = get();
    const dateKey = todayKey();
    const nextSignature = dataSignature ?? state.dataSignature;
    const nextLevelKey = levelKey ?? state.levelKey;
    set({ tasks, dateKey, dataSignature: nextSignature, levelKey: nextLevelKey });
    saveToStorage(getSettings({ ...state, tasks, dateKey, dataSignature: nextSignature, levelKey: nextLevelKey }));
  },

  setDateKey: (dateKey) => {
    const state = get();
    set({ dateKey });
    saveToStorage(getSettings({ ...state, dateKey }));
  },

  completeTask: (taskId) => {
    const state = get();
    const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t));
    set({ tasks });
    saveToStorage(getSettings({ ...state, tasks }));
  },

  skipTask: (taskId) => {
    const state = get();
    const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, skipped: true } : t));
    set({ tasks });
    saveToStorage(getSettings({ ...state, tasks }));
  },

  updateStreak: () => {
    const state = get();
    const today = todayKey();
    const yesterday = yesterdayKey();

    // Already updated today
    if (state.lastActiveDate === today) return;

    let streak: number;
    if (state.lastActiveDate === yesterday) {
      streak = state.streak + 1;
    } else {
      streak = 1;
    }

    set({ streak, lastActiveDate: today });
    saveToStorage(getSettings({ ...state, streak, lastActiveDate: today }));
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));
