import { describe, expect, it } from 'vitest';
import {
  accuracyToRating,
  cardToData,
  createNewCard,
  dataToCard,
  formatInterval,
  gradeCard,
  migrateToFSRS,
  previewRatings,
  Rating,
  State,
} from '@/lib/fsrs';

describe('accuracyToRating', () => {
  it('maps accuracy < 50 to Again', () => {
    expect(accuracyToRating(0)).toBe(Rating.Again);
    expect(accuracyToRating(49)).toBe(Rating.Again);
  });

  it('maps accuracy 50-69 to Hard', () => {
    expect(accuracyToRating(50)).toBe(Rating.Hard);
    expect(accuracyToRating(69)).toBe(Rating.Hard);
  });

  it('maps accuracy 70-89 to Good', () => {
    expect(accuracyToRating(70)).toBe(Rating.Good);
    expect(accuracyToRating(89)).toBe(Rating.Good);
  });

  it('maps accuracy >= 90 to Easy', () => {
    expect(accuracyToRating(90)).toBe(Rating.Easy);
    expect(accuracyToRating(100)).toBe(Rating.Easy);
  });
});

describe('createNewCard', () => {
  it('creates a card in New state', () => {
    const card = createNewCard();
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });
});

describe('cardToData / dataToCard roundtrip', () => {
  it('preserves card data through serialization', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const card = createNewCard(now);
    const data = cardToData(card);
    const restored = dataToCard(data);

    expect(restored.stability).toBe(card.stability);
    expect(restored.difficulty).toBe(card.difficulty);
    expect(restored.reps).toBe(card.reps);
    expect(restored.lapses).toBe(card.lapses);
    expect(restored.state).toBe(card.state);
  });
});

describe('gradeCard', () => {
  it('grades a new card and returns updated data', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const { cardData, nextReview } = gradeCard(undefined, Rating.Good, now);

    expect(cardData.reps).toBe(1);
    expect(cardData.state).not.toBe(State.New);
    expect(nextReview).toBeGreaterThan(now.getTime());
  });

  it('returns different intervals for different ratings', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const again = gradeCard(undefined, Rating.Again, now);
    const easy = gradeCard(undefined, Rating.Easy, now);

    expect(easy.nextReview).toBeGreaterThan(again.nextReview);
  });

  it('can grade an existing card', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const first = gradeCard(undefined, Rating.Good, now);

    const later = new Date('2025-01-16T12:00:00Z');
    const second = gradeCard(first.cardData, Rating.Good, later);

    expect(second.cardData.reps).toBe(2);
    expect(second.nextReview).toBeGreaterThan(later.getTime());
  });
});

describe('previewRatings', () => {
  it('returns previews for all four ratings', () => {
    const preview = previewRatings(undefined);

    expect(preview[Rating.Again]).toBeDefined();
    expect(preview[Rating.Hard]).toBeDefined();
    expect(preview[Rating.Good]).toBeDefined();
    expect(preview[Rating.Easy]).toBeDefined();

    // Each should have a next review time and interval string
    for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      expect(typeof preview[r].nextReview).toBe('number');
      expect(typeof preview[r].interval).toBe('string');
      expect(preview[r].interval.length).toBeGreaterThan(0);
    }
  });

  it('easy interval is longer than again interval', () => {
    const preview = previewRatings(undefined);
    expect(preview[Rating.Easy].nextReview).toBeGreaterThan(preview[Rating.Again].nextReview);
  });
});

describe('formatInterval', () => {
  it('formats minutes', () => {
    expect(formatInterval(5 * 60_000)).toBe('5m');
    expect(formatInterval(30_000)).toBe('1m');
  });

  it('formats hours', () => {
    expect(formatInterval(2 * 60 * 60_000)).toBe('2h');
  });

  it('formats days', () => {
    expect(formatInterval(3 * 24 * 60 * 60_000)).toBe('3d');
  });

  it('formats months', () => {
    expect(formatInterval(45 * 24 * 60 * 60_000)).toBe('2mo');
  });
});

describe('migrateToFSRS', () => {
  it('creates a Review-state card for existing records', () => {
    const now = Date.now();
    const nextReview = now + 3 * 24 * 60 * 60 * 1000;
    const data = migrateToFSRS(nextReview, now, 5);

    expect(data.state).toBe(State.Review);
    expect(data.reps).toBe(5);
    expect(data.due).toBe(nextReview);
    expect(data.stability).toBeCloseTo(3, 0);
  });

  it('creates a New-state card for records with 0 attempts', () => {
    const data = migrateToFSRS(undefined, Date.now(), 0);
    expect(data.state).toBe(State.New);
    expect(data.reps).toBe(0);
  });
});
