export type LearningActivity =
  | 'comprehension'
  | 'writing'
  | 'retelling'
  | 'personal-example'
  | 'sentence-pronunciation';

export type TextCycleStage = 'understand' | 'output' | 'correct' | 'recall' | 'apply';
export type RecallRating = 'again' | 'hard' | 'good' | 'easy';
export interface TextCycleEvidence {
  stage: 'recall' | 'apply';
  referenceAttemptId: string;
  sourceRevealed?: boolean;
  assisted?: boolean;
  rating?: RecallRating;
  expression?: string;
  context?: string;
}

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
  cycle?: TextCycleEvidence;
  sourceWeakSpotId?: string;
  createdAt: number;
  updatedAt: number;
}
