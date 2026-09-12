export type LearningActivity =
  | 'comprehension'
  | 'writing'
  | 'retelling'
  | 'personal-example'
  | 'sentence-pronunciation';

/** Immutable submission. Revisions append a new record, never replace evidence. */
export interface LearningAttempt {
  id: string;
  lessonId: string;
  unitId: string;
  activity: LearningActivity;
  sourceContentIds: string[];
  sourceText: string;
  prompt: string;
  answer: string;
  evidenceQuote?: string;
  parentAttemptId?: string;
  feedback: { source: 'self' | 'ai'; notes: string; checklist: string[]; provider?: string };
  status: 'submitted' | 'revised';
  recordingId?: string;
  usedTranslation?: boolean;
  sourceWeakSpotId?: string;
  createdAt: number;
  updatedAt: number;
}
