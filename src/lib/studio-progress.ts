import type { LessonSegment } from '@/lib/lesson-segments';

/** Per-lesson studio progress, kept on this device so a lesson can be resumed. */
export interface StudioProgress {
  /** Segment ids heard in full at least once. */
  heard: string[];
  /** Best dictation accuracy per segment id (0–100). */
  dictation: Record<string, number>;
  /** Best shadowing accuracy per segment id (0–100). */
  shadow: Record<string, number>;
}

export const EMPTY_PROGRESS: StudioProgress = { heard: [], dictation: {}, shadow: {} };

function key(scope: string, lessonId: string) {
  return `echotype:studio:${scope}:${lessonId}`;
}

export function loadStudioProgress(scope: string, lessonId: string): StudioProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(key(scope, lessonId));
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<StudioProgress>;
    return {
      heard: Array.isArray(parsed.heard) ? parsed.heard.filter((id) => typeof id === 'string') : [],
      dictation: parsed.dictation && typeof parsed.dictation === 'object' ? parsed.dictation : {},
      shadow: parsed.shadow && typeof parsed.shadow === 'object' ? parsed.shadow : {},
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveStudioProgress(scope: string, lessonId: string, progress: StudioProgress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(scope, lessonId), JSON.stringify(progress));
  } catch {
    /* storage full or unavailable — progress stays in memory */
  }
}

export function clearStudioProgress(scope: string, lessonId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key(scope, lessonId));
  } catch {
    /* ignore */
  }
}

export type StudioSkill = 'listen' | 'write' | 'speak';

/** Coverage of one skill for the segments belonging to one exercise item. */
export function itemCoverage(progress: StudioProgress, segments: LessonSegment[], itemId: string, skill: StudioSkill) {
  const own = segments.filter((segment) => segment.itemId === itemId);
  const scores =
    skill === 'listen'
      ? own.map((segment) => (progress.heard.includes(segment.id) ? 100 : undefined))
      : own.map((segment) => (skill === 'write' ? progress.dictation : progress.shadow)[segment.id]);
  const done = scores.filter((score): score is number => score !== undefined);
  return {
    total: own.length,
    done: done.length,
    complete: own.length > 0 && done.length === own.length,
    average: done.length ? Math.round(done.reduce((sum, score) => sum + score, 0) / done.length) : 0,
  };
}
