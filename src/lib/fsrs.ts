import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

// ─── FSRS Scheduler Singleton ────────────────────────────────────────────────

const params = generatorParameters({ enable_fuzz: true });
const scheduler = fsrs(params);

export { Rating, State };
export type { Card };

// ─── Serializable card shape stored in Dexie ─────────────────────────────────

export interface FSRSCardData {
  due: number; // timestamp ms
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps?: number;
  state: 0 | 1 | 2 | 3; // State enum values
  last_review: number; // timestamp ms
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map an accuracy percentage (0-100) to an FSRS Rating. */
export function accuracyToRating(accuracy: number): Rating {
  if (accuracy < 50) return Rating.Again;
  if (accuracy < 70) return Rating.Hard;
  if (accuracy < 90) return Rating.Good;
  return Rating.Easy;
}

/** Create a brand-new FSRS card (New state). */
export function createNewCard(now: Date = new Date()): Card {
  return createEmptyCard(now) as Card;
}

/** Convert a ts-fsrs Card to our serializable shape. */
export function cardToData(card: Card): FSRSCardData {
  return {
    due: new Date(card.due).getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: (card as unknown as Record<string, unknown>).learning_steps as number | undefined,
    state: card.state as 0 | 1 | 2 | 3,
    last_review: card.last_review ? new Date(card.last_review).getTime() : Date.now(),
  };
}

/** Convert our stored data back to a ts-fsrs Card. */
export function dataToCard(data: FSRSCardData): Card {
  return {
    due: new Date(data.due),
    stability: data.stability,
    difficulty: data.difficulty,
    elapsed_days: data.elapsed_days,
    scheduled_days: data.scheduled_days,
    reps: data.reps,
    lapses: data.lapses,
    learning_steps: data.learning_steps ?? 0,
    state: data.state as State,
    last_review: new Date(data.last_review),
  } as Card;
}

/**
 * Grade a card with the given rating and return the updated card data
 * plus the next review timestamp.
 */
export function gradeCard(
  cardData: FSRSCardData | undefined,
  rating: Rating,
  now: Date = new Date(),
): { cardData: FSRSCardData; nextReview: number } {
  const card = cardData ? dataToCard(cardData) : createNewCard(now);
  const result = scheduler.repeat(card, now);
  // biome-ignore lint/suspicious/noExplicitAny: ts-fsrs IPreview type doesn't support numeric indexing
  const next = (result as any)[rating as number] as { card: Card; log: unknown };
  const updated = cardToData(next.card);
  return { cardData: updated, nextReview: updated.due };
}

/**
 * Preview all four rating options and return predicted next review dates.
 * Useful for showing the user what each button would do.
 */
export function previewRatings(
  cardData: FSRSCardData | undefined,
  now: Date = new Date(),
): Record<Rating, { nextReview: number; interval: string }> {
  const card = cardData ? dataToCard(cardData) : createNewCard(now);
  // biome-ignore lint/suspicious/noExplicitAny: ts-fsrs IPreview type doesn't support numeric indexing
  const result = scheduler.repeat(card, now) as any;

  const preview = {} as Record<Rating, { nextReview: number; interval: string }>;
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const next = result[r as number] as { card: Card; log: unknown };
    const due = new Date(next.card.due).getTime();
    preview[r] = {
      nextReview: due,
      interval: formatInterval(due - now.getTime()),
    };
  }
  return preview;
}

/** Format a millisecond duration to a human-readable short string. */
export function formatInterval(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

/**
 * Build an FSRSCardData for an existing record that was created before FSRS.
 * Approximates stability from the old nextReviewDelayDays logic.
 */
export function migrateToFSRS(nextReview: number | undefined, lastPracticed: number, attempts: number): FSRSCardData {
  const now = lastPracticed || Date.now();
  const stabilityDays =
    nextReview && lastPracticed ? Math.max(1, (nextReview - lastPracticed) / (24 * 60 * 60 * 1000)) : 1;

  return {
    due: nextReview ?? now,
    stability: stabilityDays,
    difficulty: 5, // mid-range
    elapsed_days: 0,
    scheduled_days: stabilityDays,
    reps: attempts,
    lapses: 0,
    learning_steps: 0,
    state: attempts > 0 ? (State.Review as 0 | 1 | 2 | 3) : (State.New as 0 | 1 | 2 | 3),
    last_review: now,
  };
}
