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

export const CEFR_DESCRIPTIONS: Record<CEFRLevel, { summary: string; canDo: string; tip: string }> = {
  A1: {
    summary: 'You can understand and use basic everyday expressions.',
    canDo:
      'Introduce yourself, ask simple questions about personal details, interact in a simple way if the other person speaks slowly.',
    tip: 'Focus on basic vocabulary, simple sentence patterns, and daily conversation phrases.',
  },
  A2: {
    summary: 'You can communicate in simple, routine tasks on familiar topics.',
    canDo: 'Describe your background, immediate environment, and matters of immediate need in simple terms.',
    tip: 'Expand your vocabulary around daily topics and practice simple past/future tenses.',
  },
  B1: {
    summary: 'You can deal with most situations likely to arise while travelling.',
    canDo: 'Describe experiences, events, dreams, and ambitions. Give reasons and explanations for opinions and plans.',
    tip: 'Practice reading short articles, watching English media with subtitles, and writing paragraphs.',
  },
  B2: {
    summary: 'You can interact with a degree of fluency with native speakers.',
    canDo:
      'Understand the main ideas of complex text on concrete and abstract topics. Produce clear, detailed text on a wide range of subjects.',
    tip: 'Read longer articles, watch English content without subtitles, and practice expressing opinions on complex topics.',
  },
  C1: {
    summary: 'You can use English flexibly and effectively for social, academic, and professional purposes.',
    canDo:
      'Understand demanding, longer texts and recognize implicit meaning. Express ideas fluently and spontaneously without much searching for expressions.',
    tip: 'Focus on nuance, idiomatic expressions, and academic/professional writing skills.',
  },
  C2: {
    summary: 'You can understand virtually everything heard or read with ease.',
    canDo:
      'Summarize information from different spoken and written sources. Express yourself spontaneously, very fluently, and precisely.',
    tip: 'Maintain your level through extensive reading, professional writing, and engaging with complex content.',
  },
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
  setCurrentLevel: (level: CEFRLevel) => void;
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
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(settings: AssessmentSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const defaults: AssessmentSettings = {
  currentLevel: null,
  history: [],
  dismissedReminder: false,
  reminderThreshold: DEFAULT_THRESHOLD,
};

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  ...defaults,

  setCurrentLevel: (level) => {
    const state = get();
    const updated: AssessmentSettings = {
      currentLevel: level,
      history: state.history,
      dismissedReminder: state.dismissedReminder,
      reminderThreshold: state.reminderThreshold,
    };
    set({ currentLevel: level });
    saveToStorage(updated);
  },

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
