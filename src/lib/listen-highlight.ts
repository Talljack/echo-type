export interface SentenceTimingInput {
  text: string;
  wordCount: number;
}

export interface SentenceTimingSegment {
  startMs: number;
  durationMs: number;
}

const DEFAULT_MIN_SENTENCE_DURATION_MS = 900;
const BASE_WPM = 150;
const COMMA_PAUSE_WEIGHT = 1.8;
const CLAUSE_PAUSE_WEIGHT = 2.4;
const END_PAUSE_WEIGHT = 3.2;
const DIGIT_TOKEN_WEIGHT = 0.65;
const ALL_CAPS_TOKEN_WEIGHT = 0.35;
const DECIMAL_TOKEN_WEIGHT = 0.45;
const ABBREVIATION_TOKEN_WEIGHT = 0.25;
const LONG_WORD_WEIGHT = 0.08;

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function countWeightedTokens(text: string): number {
  const tokens = text.match(/[A-Za-z0-9]+(?:[.'/-][A-Za-z0-9]+)*/g) ?? [];

  return tokens.reduce((sum, token) => {
    let weight = 1;

    if (/\d/.test(token)) {
      weight += DIGIT_TOKEN_WEIGHT;
    }

    if (/^\d+[.,:]\d+$/.test(token)) {
      weight += DECIMAL_TOKEN_WEIGHT;
    }

    if (/^(?:[A-Za-z]\.){2,}[A-Za-z]?$/i.test(token) || /^(mr|mrs|ms|dr|prof|sr|jr|vs|etc)\.?$/i.test(token)) {
      weight += ABBREVIATION_TOKEN_WEIGHT;
    }

    if (/^[A-Z]{2,}$/.test(token)) {
      weight += ALL_CAPS_TOKEN_WEIGHT;
    }

    if (token.replace(/[^A-Za-z]/g, '').length >= 9) {
      weight += LONG_WORD_WEIGHT;
    }

    return sum + weight;
  }, 0);
}

export function estimateSentenceWeight(sentence: SentenceTimingInput): number {
  const weightedTokens = countWeightedTokens(sentence.text);
  const fallbackWords = Math.max(sentence.wordCount, 1);
  const baseWeight = Math.max(weightedTokens, fallbackWords);

  const commaPauseCount = countMatches(sentence.text, /[,،]/g);
  const clausePauseCount = countMatches(sentence.text, /[;:]/g);
  const endPauseCount = countMatches(sentence.text, /[.!?]+(?=\s*$)/g);

  return (
    baseWeight +
    commaPauseCount * COMMA_PAUSE_WEIGHT +
    clausePauseCount * CLAUSE_PAUSE_WEIGHT +
    endPauseCount * END_PAUSE_WEIGHT
  );
}

export function estimateSentenceHighlightTimings(
  sentences: SentenceTimingInput[],
  rate: number,
): SentenceTimingSegment[] {
  if (sentences.length === 0) {
    return [];
  }

  const safeRate = Math.max(rate, 0.1);
  const weights = sentences.map(estimateSentenceWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const totalDurationMs = Math.max(1_000, (Math.max(totalWeight, 1) / (BASE_WPM * safeRate)) * 60 * 1_000);

  let elapsedMs = 0;

  return weights.map((weight, index) => {
    const remainingCount = sentences.length - index;
    const remainingMs = Math.max(totalDurationMs - elapsedMs, DEFAULT_MIN_SENTENCE_DURATION_MS);
    const proportionalDuration = (weight / Math.max(totalWeight, 1)) * totalDurationMs;
    const maxDurationForCurrent = Math.max(
      DEFAULT_MIN_SENTENCE_DURATION_MS,
      remainingMs - DEFAULT_MIN_SENTENCE_DURATION_MS * (remainingCount - 1),
    );
    const durationMs =
      index === sentences.length - 1
        ? Math.max(DEFAULT_MIN_SENTENCE_DURATION_MS, remainingMs)
        : Math.min(maxDurationForCurrent, Math.max(DEFAULT_MIN_SENTENCE_DURATION_MS, proportionalDuration));

    const segment = {
      startMs: elapsedMs,
      durationMs,
    };

    elapsedMs += durationMs;
    return segment;
  });
}
