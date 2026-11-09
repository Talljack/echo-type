import 'fake-indexeddb/auto';
import Dexie, { type Table } from 'dexie';
import { describe, expect, it } from 'vitest';
import type { MediaBlobEntry } from '@/lib/db';
import { createLearningAttempt } from '@/lib/learning-activity';
import { persistLearningAttempt } from '@/lib/learning-activity-persistence';
import type { LearningAttempt } from '@/types/learning-activity';

function database(name: string) {
  const db = new Dexie(name) as Dexie & { learningAttempts: Table<LearningAttempt>; mediaBlobs: Table<MediaBlobEntry> };
  db.version(1).stores({ learningAttempts: 'id', mediaBlobs: 'contentId' });
  return db;
}
const base = { lessonId: 'lesson', unitId: 'unit', activity: 'sentence-pronunciation' as const, sourceText: 'First sentence. Second sentence.', sourceContentIds: ['source'], answer: 'Second sentence.' };

describe('course recorded acoustic evidence persistence', () => {
  it('retains source reference, actual metrics and audio together after separate AI text feedback', async () => {
    const db = database('course-acoustic-evidence');
    const audio = new Blob(['captured pcm'], { type: 'audio/wav' });
    const attempt = createLearningAttempt({ ...base, feedback: { source: 'ai', notes: 'Separate text feedback', checklist: [] } });
    attempt.acousticAssessment = { referenceText: 'Second sentence.', fluency: 74, phonemes: [{ phoneme: 's', score: 62 }], words: [{ word: 'Second', score: 80 }] };
    try {
      await persistLearningAttempt(db, attempt, audio, () => true);
      const saved = await db.learningAttempts.get(attempt.id);
      expect(saved?.feedback.source).toBe('ai');
      expect(saved?.acousticAssessment).toEqual(attempt.acousticAssessment);
      expect(saved?.acousticAssessment).not.toHaveProperty('overall');
      expect(saved?.recordingId).toBeTruthy();
      const recording = await db.mediaBlobs.get(saved!.recordingId!);
      expect(await recording!.blob.text()).toBe('captured pcm');
    } finally { await db.delete(); }
  });

  it('retains previous recording scores while a new unassessed revision has no fabricated score', async () => {
    const db = database('course-acoustic-revision');
    const prior = createLearningAttempt({ ...base, feedback: { source: 'acoustic', provider: 'speechsuper', notes: 'Actual acoustic evidence', checklist: ['Overall: 80/100'] } });
    prior.acousticAssessment = { referenceText: 'Second sentence.', overall: 80, phonemes: [] };
    try {
      await persistLearningAttempt(db, prior, new Blob(['first recording']), () => true);
      const revision = createLearningAttempt({ ...base, parentAttemptId: prior.id });
      await persistLearningAttempt(db, revision, new Blob(['new recording']), () => true);
      expect((await db.learningAttempts.get(prior.id))?.acousticAssessment?.overall).toBe(80);
      expect((await db.learningAttempts.get(revision.id))?.acousticAssessment).toBeUndefined();
      expect(revision.recordingId).not.toBe(prior.recordingId);
      expect(await db.learningAttempts.count()).toBe(2);
    } finally { await db.delete(); }
  });
});
