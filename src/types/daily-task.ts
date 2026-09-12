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
  learningDays?: number[];
}
