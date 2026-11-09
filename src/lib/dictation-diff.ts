import { calculateStats, compareWords, type WordAccuracy } from '@/lib/levenshtein';

export interface DiffToken {
  /** What to display: the expected word (with its punctuation) or the learner's extra word. */
  text: string;
  accuracy: WordAccuracy;
  /** What the learner typed for this position, when it differs. */
  typed?: string;
}

export interface DictationResult {
  tokens: DiffToken[];
  accuracy: number;
  correct: number;
  total: number;
  /** True when every expected word was typed correctly (ignoring case and punctuation). */
  perfect: boolean;
}

/** Lower-case word with letters, digits, apostrophes and inner hyphens kept. */
export function normalizeDictationWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'-]/g, '')
    .replace(/^['-]+|['-]+$/g, '');
}

function tokenize(text: string) {
  return text
    .replace(/[—–]/g, ' ')
    .split(/\s+/)
    .map((display) => ({ display, norm: normalizeDictationWord(display) }))
    .filter((token) => token.norm);
}

/**
 * Word-level diff between the expected sentence and what the learner typed.
 * Case and punctuation never count as mistakes; spelling near-misses are "close".
 */
export function diffDictation(expected: string, typed: string): DictationResult {
  const target = tokenize(expected);
  const answer = tokenize(typed);
  const results = compareWords(
    target.map((token) => token.norm),
    answer.map((token) => token.norm),
  );
  let expectedIndex = 0;
  const tokens: DiffToken[] = results.map((result) => {
    if (result.accuracy === 'extra') return { text: result.word, accuracy: 'extra' };
    const display = target[expectedIndex]?.display ?? result.word;
    expectedIndex += 1;
    const exact = result.recognized !== undefined && result.recognized === result.word;
    return {
      text: display,
      // compareWords treats ≥0.9 similarity as correct; for spelling we only accept exact words.
      accuracy: result.accuracy === 'correct' && !exact ? 'close' : result.accuracy,
      typed: exact ? undefined : result.recognized,
    };
  });
  const stats = calculateStats(tokens.map((token) => ({ word: token.text, accuracy: token.accuracy, similarity: 0 })));
  return {
    tokens,
    accuracy: target.length ? stats.accuracy : 0,
    correct: stats.correct,
    total: stats.total,
    perfect: target.length > 0 && tokens.every((token) => token.accuracy === 'correct'),
  };
}
