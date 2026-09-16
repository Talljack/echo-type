export type DailyTaskKind = 'course' | 'review' | 'favorite' | 'weak-spot' | 'pronunciation' | 'settings';
export type DailyTaskStatus = 'pending' | 'in-progress' | 'paused' | 'completed' | 'skipped' | 'deferred';

/** A persisted recommendation. Completion always references saved learning evidence. */
export interface DailyTask {
  id: string;
  dateKey: string;
  originDateKey: string;
  kind: DailyTaskKind;
  sourceId: string;
  title: string;
  titleZh: string;
  reason: string;
  reasonZh: string;
  href: string;
  minutes: number;
  status: DailyTaskStatus;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  evidenceIds?: string[];
  contentIds?: string[];
  module?: 'listen' | 'speak' | 'read' | 'write';
  lessonId?: string;
  /** Stable recommendation rank survives IndexedDB primary-key ordering. */
  priority?: number;
  vocabularyMode?: import('@/lib/vocabulary').VocabularyMode;
  newWordsPerDay?: number;
  stage?: 'understand' | 'output' | 'correct' | 'recall' | 'apply';
  sourceText?: string;
  referenceAttemptId?: string;
  dueAt?: number;
  /** Retained history whose stage or source has advanced; never actionable. */
  superseded?: boolean;
  learningDays?: number[];
}
