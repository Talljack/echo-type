import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficiency',
};

export const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface AssessmentAnswer {
  questionIndex: number;
  correct: boolean;
}

export interface AssessmentResult {
  level: CEFRLevel;
  score: number;
  completedAt: number;
  sessionsAtTest: number;
  answers: AssessmentAnswer[];
  /** Breakdown by category */
  breakdown: { vocabulary: number; grammar: number; reading: number };
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'echotype_assessment';
const DEFAULT_THRESHOLD = 50;

interface AssessmentSettings {
  currentLevel: CEFRLevel | null;
  history: AssessmentResult[];
  dismissedReminder: boolean;
  reminderThreshold: number;
}

interface AssessmentStore extends AssessmentSettings {
  setResult: (result: AssessmentResult) => void;
  dismissReminder: () => void;
  resetReminder: () => void;
  shouldShowReminder: (totalSessions: number) => boolean;
  hydrate: () => void;
}

function loadFromStorage(): Partial<AssessmentSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveToStorage(settings: AssessmentSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

const defaults: AssessmentSettings = {
  currentLevel: null,
  history: [],
  dismissedReminder: false,
  reminderThreshold: DEFAULT_THRESHOLD,
};

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  ...defaults,

  setResult: (result) => {
    const state = get();
    const updated = {
      currentLevel: result.level,
      history: [...state.history, result],
      dismissedReminder: false,
      reminderThreshold: state.reminderThreshold,
    };
    set(updated);
    saveToStorage(updated);
  },

  dismissReminder: () => {
    const state = get();
    const updated: AssessmentSettings = {
      currentLevel: state.currentLevel,
      history: state.history,
      dismissedReminder: true,
      reminderThreshold: state.reminderThreshold,
    };
    set({ dismissedReminder: true });
    saveToStorage(updated);
  },

  resetReminder: () => {
    const state = get();
    const updated: AssessmentSettings = {
      currentLevel: state.currentLevel,
      history: state.history,
      dismissedReminder: false,
      reminderThreshold: state.reminderThreshold,
    };
    set({ dismissedReminder: false });
    saveToStorage(updated);
  },

  shouldShowReminder: (totalSessions) => {
    const { history, dismissedReminder, reminderThreshold } = get();
    if (dismissedReminder) return false;
    if (history.length === 0) return false;
    const lastTest = history[history.length - 1];
    return totalSessions - lastTest.sessionsAtTest >= reminderThreshold;
  },

  hydrate: () => {
    const saved = loadFromStorage();
    if (Object.keys(saved).length > 0) {
      set(saved);
    }
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function scoreToLevel(score: number): CEFRLevel {
  if (score <= 20) return 'A1';
  if (score <= 40) return 'A2';
  if (score <= 55) return 'B1';
  if (score <= 70) return 'B2';
  if (score <= 85) return 'C1';
  return 'C2';
}

export function levelComparison(prev: CEFRLevel, current: CEFRLevel): 'improved' | 'same' | 'declined' {
  const prevIdx = CEFR_ORDER.indexOf(prev);
  const currIdx = CEFR_ORDER.indexOf(current);
  if (currIdx > prevIdx) return 'improved';
  if (currIdx < prevIdx) return 'declined';
  return 'same';
}
