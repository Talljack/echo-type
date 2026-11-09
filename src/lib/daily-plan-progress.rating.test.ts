import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TypingSession } from '@/types/content';
import { savePracticeSession, updateRecordWithRating } from './daily-plan-progress';
import { db } from './db';
import { gradeCard, previewRatings, Rating } from './fsrs';

const DAY = 24 * 60 * 60 * 1000;

function session(id: string, at: number, accuracy: number): TypingSession {
  return {
    id,
    contentId: 'content-1',
    module: 'write',
    startTime: at - 60_000,
    endTime: at,
    totalChars: 40,
    correctChars: Math.round((40 * accuracy) / 100),
    wrongChars: 40 - Math.round((40 * accuracy) / 100),
    totalWords: 8,
    wpm: 30,
    accuracy,
    completed: true,
  };
}

beforeEach(async () => {
  await Promise.all([db.contents.clear(), db.records.clear(), db.sessions.clear()]);
});

describe('updateRecordWithRating in the review queue', () => {
  it('replaces the automatic practice grade instead of stacking a second repetition', async () => {
    const firstPractice = Date.parse('2026-11-01T08:00:00Z');
    await savePracticeSession(session('s1', firstPractice, 100));
    const [record] = await db.records.toArray();
    const queueSnapshot = record.fsrsCard; // what the review queue loaded before practising

    const reviewAt = firstPractice + 10 * DAY;
    // Practising the due item auto-grades the card from accuracy...
    await savePracticeSession(session('s2', reviewAt, 40));
    expect((await db.records.get(record.id))?.fsrsCard?.reps).toBe((queueSnapshot?.reps ?? 0) + 1);

    // ...then the learner's explicit rating must replace that grade, not add a third repetition.
    const ratedAt = new Date(reviewAt + 5_000);
    await updateRecordWithRating(record.id, Rating.Easy, ratedAt, { baseCard: queueSnapshot });

    const updated = await db.records.get(record.id);
    const expected = gradeCard(queueSnapshot, Rating.Easy, ratedAt);
    expect(updated?.fsrsCard).toEqual(expected.cardData);
    expect(updated?.nextReview).toBe(expected.nextReview);
    expect(updated?.fsrsCard?.reps).toBe((queueSnapshot?.reps ?? 0) + 1);
    // The saved schedule is exactly the one the Easy button previewed.
    expect(updated?.nextReview).toBe(previewRatings(queueSnapshot, ratedAt)[Rating.Easy].nextReview);
  });

  it('treats an undefined base card as a brand-new card', async () => {
    const at = Date.parse('2026-11-01T08:00:00Z');
    await savePracticeSession(session('s1', at, 100));
    const [record] = await db.records.toArray();

    const ratedAt = new Date(at + 5_000);
    await updateRecordWithRating(record.id, Rating.Again, ratedAt, { baseCard: undefined });

    const updated = await db.records.get(record.id);
    expect(updated?.fsrsCard).toEqual(gradeCard(undefined, Rating.Again, ratedAt).cardData);
  });

  it('keeps grading the stored card when no base card is given', async () => {
    const at = Date.parse('2026-11-01T08:00:00Z');
    await savePracticeSession(session('s1', at, 100));
    const [record] = await db.records.toArray();

    const ratedAt = new Date(at + 2 * DAY);
    await updateRecordWithRating(record.id, Rating.Good, ratedAt);

    const updated = await db.records.get(record.id);
    expect(updated?.fsrsCard).toEqual(gradeCard(record.fsrsCard, Rating.Good, ratedAt).cardData);
  });
});
