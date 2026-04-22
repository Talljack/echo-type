export type WordAccuracy = 'correct' | 'close' | 'wrong' | 'missing' | 'extra';

export interface WordResult {
  word: string;
  accuracy: WordAccuracy;
  recognized?: string;
  similarity: number;
  hint?: string;
}

export type ProgressiveWordAccuracy = WordAccuracy | 'pending';

export interface ProgressiveWordResult {
  word: string;
  accuracy: ProgressiveWordAccuracy;
  recognized?: string;
  similarity: number;
  hint?: string;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function wordSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function alignWords(original: string[], recognized: string[]): { orig: string | null; rec: string | null }[] {
  const m = original.length;
  const n = recognized.length;
  const gap = -1;
  const match = 2;
  const mismatch = -1;

  const score: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) score[i][0] = i * gap;
  for (let j = 0; j <= n; j++) score[0][j] = j * gap;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const similarity = wordSimilarity(original[i - 1], recognized[j - 1]);
      const matchScore = similarity >= 0.5 ? match * similarity : mismatch;
      score[i][j] = Math.max(score[i - 1][j - 1] + matchScore, score[i - 1][j] + gap, score[i][j - 1] + gap);
    }
  }

  const aligned: { orig: string | null; rec: string | null }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const similarity = wordSimilarity(original[i - 1], recognized[j - 1]);
      const matchScore = similarity >= 0.5 ? match * similarity : mismatch;
      if (score[i][j] === score[i - 1][j - 1] + matchScore) {
        aligned.unshift({ orig: original[i - 1], rec: recognized[j - 1] });
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && score[i][j] === score[i - 1][j] + gap) {
      aligned.unshift({ orig: original[i - 1], rec: null });
      i--;
    } else {
      aligned.unshift({ orig: null, rec: recognized[j - 1] });
      j--;
    }
  }

  return aligned;
}

function getHint(accuracy: WordAccuracy, original: string, recognized?: string): string | undefined {
  if (accuracy === 'correct') return undefined;
  if (accuracy === 'missing') return 'You skipped this word';
  if (accuracy === 'extra') return 'This word was not in the original text';
  if (!recognized) return undefined;

  const origLower = original.toLowerCase();
  const recLower = recognized.toLowerCase();

  if (origLower.replace(/[aeiou]/g, '') === recLower.replace(/[aeiou]/g, '')) {
    return `Vowel pronunciation: you said "${recognized}" instead of "${original}"`;
  }

  if (origLower.slice(0, -1) === recLower.slice(0, -1)) {
    return `Ending sound: you said "${recognized}" — check the last sound`;
  }

  if (origLower.slice(1) === recLower.slice(1)) {
    return `Beginning sound: you said "${recognized}" — check the first sound`;
  }

  if (accuracy === 'close') {
    return `Close! You said "${recognized}" instead of "${original}"`;
  }

  return `You said "${recognized}" instead of "${original}"`;
}

export function compareWords(original: string[], recognized: string[]): WordResult[] {
  if (recognized.length === 0) {
    return original.map((word) => ({
      word,
      accuracy: 'missing' as const,
      similarity: 0,
      hint: 'You skipped this word',
    }));
  }

  const aligned = alignWords(original, recognized);

  return aligned.map(({ orig, rec }) => {
    if (!orig) {
      return {
        word: rec!,
        accuracy: 'extra' as const,
        recognized: rec!,
        similarity: 0,
        hint: 'This word was not in the original text',
      };
    }

    if (!rec) {
      return {
        word: orig,
        accuracy: 'missing' as const,
        similarity: 0,
        hint: 'You skipped this word',
      };
    }

    const similarity = wordSimilarity(orig, rec);
    let accuracy: WordAccuracy;
    if (similarity >= 0.9) accuracy = 'correct';
    else if (similarity >= 0.6) accuracy = 'close';
    else accuracy = 'wrong';

    return {
      word: orig,
      accuracy,
      recognized: rec,
      similarity,
      hint: getHint(accuracy, orig, rec),
    };
  });
}

export function buildProgressiveWordResults(original: string[], recognized: string[]): ProgressiveWordResult[] {
  const consumedCount = Math.min(original.length, recognized.length);
  const consumedOriginal = original.slice(0, consumedCount);
  const consumedRecognized = recognized.slice(0, consumedCount);
  const consumedResults = compareWords(consumedOriginal, consumedRecognized);
  const pendingResults = original.slice(consumedCount).map((word) => ({
    word,
    accuracy: 'pending' as const,
    similarity: 0,
  }));

  return [...consumedResults, ...pendingResults];
}

export function calculateStats(results: WordResult[]) {
  const total = results.filter((r) => r.accuracy !== 'extra').length;
  const correct = results.filter((r) => r.accuracy === 'correct').length;
  const close = results.filter((r) => r.accuracy === 'close').length;
  const wrong = results.filter((r) => r.accuracy === 'wrong').length;
  const missing = results.filter((r) => r.accuracy === 'missing').length;
  const extra = results.filter((r) => r.accuracy === 'extra').length;
  const accuracy = total > 0 ? Math.round(((correct + close * 0.5) / total) * 100) : 0;

  return { total, correct, close, wrong, missing, extra, accuracy };
}
