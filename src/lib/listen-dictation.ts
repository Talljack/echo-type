import { levenshteinDistance } from '@/lib/levenshtein';
import { normalizeText } from '@/lib/text-normalize';

export function scoreDictationAttempt(expected: string, actual: string) {
  const normalizedExpected = normalizeText(expected);
  const normalizedActual = normalizeText(actual);
  const distance = levenshteinDistance(normalizedExpected, normalizedActual);
  const maxLen = Math.max(normalizedExpected.length, 1);
  const accuracy = Math.max(0, Math.round((1 - distance / maxLen) * 100));

  return {
    normalizedExpected,
    normalizedActual,
    distance,
    accuracy,
    passed: accuracy >= 80,
  };
}
