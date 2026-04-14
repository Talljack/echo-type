import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

// ─── FSRS Scheduler Singleton ────────────────────────────────────────────────

const params = generatorParameters({ enable_fuzz: true });
const scheduler = fsrs(params);

export type { Card };
export { Rating, State };

// ─── Serializable card shape stored in AsyncStorage ─────────────────────────────

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
): Record<Rating.Again | Rating.Hard | Rating.Good | Rating.Easy, { nextReview: number; interval: string }> {
  const card = cardData ? dataToCard(cardData) : createNewCard(now);
  // biome-ignore lint/suspicious/noExplicitAny: ts-fsrs IPreview type doesn't support numeric indexing
  const result = scheduler.repeat(card, now) as any;

  return {
    [Rating.Again]: {
      nextReview: new Date(result[Rating.Again].card.due).getTime(),
      interval: formatInterval(result[Rating.Again].card.scheduled_days),
    },
    [Rating.Hard]: {
      nextReview: new Date(result[Rating.Hard].card.due).getTime(),
      interval: formatInterval(result[Rating.Hard].card.scheduled_days),
    },
    [Rating.Good]: {
      nextReview: new Date(result[Rating.Good].card.due).getTime(),
      interval: formatInterval(result[Rating.Good].card.scheduled_days),
    },
    [Rating.Easy]: {
      nextReview: new Date(result[Rating.Easy].card.due).getTime(),
      interval: formatInterval(result[Rating.Easy].card.scheduled_days),
    },
  };
}

/**
 * Format a scheduled_days value into a human-readable interval.
 */
export function formatInterval(days: number): string {
  if (days < 1) return '< 1 day';
  if (days === 1) return '1 day';
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/**
 * Migrate old learning records to FSRS format.
 * This is a one-time migration helper.
 */
export function migrateToFSRS(accuracy: number, attempts: number, lastPracticed: number | null): FSRSCardData {
  const rating = accuracyToRating(accuracy);
  const now = new Date();
  const card = createNewCard(now);

  // Simulate previous reviews based on attempts
  let currentCard = card;
  for (let i = 0; i < attempts; i++) {
    const result = scheduler.repeat(currentCard, now);
    // biome-ignore lint/suspicious/noExplicitAny: ts-fsrs IPreview type doesn't support numeric indexing
    currentCard = (result as any)[rating as number].card;
  }

  return cardToData(currentCard);
}
