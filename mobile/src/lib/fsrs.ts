// Simplified FSRS (Free Spaced Repetition Scheduler) algorithm
// Based on the FSRS-4.5 algorithm

export interface FSRSCard {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  stability: number; // memory stability (days)
  difficulty: number; // 0-1, how difficult
  elapsedDays: number; // days since last review
  scheduledDays: number; // days until next review
  reps: number; // total review count
  lapses: number; // times forgotten
  state: 'new' | 'learning' | 'review' | 'relearning';
  due: number; // timestamp of next review
  lastReview: number | null;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

const DECAY = -0.5;
const FACTOR = 19 / 81;

function forgettingCurve(elapsedDays: number, stability: number): number {
  return (1 + FACTOR * (elapsedDays / stability)) ** DECAY;
}

function nextStability(d: number, s: number, r: number, rating: Rating): number {
  const ratingMap = { again: 1, hard: 2, good: 3, easy: 4 };
  const g = ratingMap[rating];

  if (rating === 'again') {
    return Math.max(0.1, s * 0.2);
  }

  const hardPenalty = rating === 'hard' ? 0.85 : 1;
  const easyBonus = rating === 'easy' ? 1.3 : 1;

  return s * (1 + Math.exp(5.5) * (11 - d) * s ** -0.2 * (Math.exp((1 - r) * 5) - 1) * hardPenalty * easyBonus);
}

function nextDifficulty(d: number, rating: Rating): number {
  const ratingMap = { again: 1, hard: 2, good: 3, easy: 4 };
  const g = ratingMap[rating];
  const delta = g - 3;
  const newD = d - 0.1 * delta;
  return Math.min(1, Math.max(0, newD));
}

export function createNewCard(id: string, word: string, meaning: string, example?: string): FSRSCard {
  return {
    id,
    word,
    meaning,
    example,
    stability: 0.4,
    difficulty: 0.3,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    due: Date.now(),
    lastReview: null,
  };
}

export function reviewCard(card: FSRSCard, rating: Rating): FSRSCard {
  const now = Date.now();
  const daysSinceLastReview = card.lastReview ? (now - card.lastReview) / (1000 * 60 * 60 * 24) : 0;

  const retrievability = card.lastReview ? forgettingCurve(daysSinceLastReview, card.stability) : 0;

  const newDifficulty = nextDifficulty(card.difficulty, rating);
  const newStability =
    card.state === 'new'
      ? rating === 'again'
        ? 0.4
        : rating === 'hard'
          ? 1
          : rating === 'good'
            ? 3.5
            : 7
      : nextStability(card.difficulty, card.stability, retrievability, rating);

  let newState: FSRSCard['state'];
  let newLapses = card.lapses;

  if (rating === 'again') {
    newState = card.state === 'new' ? 'learning' : 'relearning';
    newLapses = card.lapses + 1;
  } else {
    newState = 'review';
  }

  const scheduledDays = Math.max(1, Math.round(newStability));
  const due = now + scheduledDays * 24 * 60 * 60 * 1000;

  return {
    ...card,
    stability: newStability,
    difficulty: newDifficulty,
    elapsedDays: daysSinceLastReview,
    scheduledDays,
    reps: card.reps + 1,
    lapses: newLapses,
    state: newState,
    due,
    lastReview: now,
  };
}

export function getNextReviewInterval(card: FSRSCard, rating: Rating): string {
  const reviewed = reviewCard(card, rating);
  const days = reviewed.scheduledDays;

  if (days < 1) return '< 1 day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

export function getDueCards(cards: FSRSCard[]): FSRSCard[] {
  const now = Date.now();
  return cards.filter((card) => card.due <= now).sort((a, b) => a.due - b.due);
}
