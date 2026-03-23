import type { FavoriteType } from '@/types/favorite';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '');
}

export function detectSelectionType(text: string): FavoriteType {
  const trimmed = text.trim();
  // Sentence: ends with sentence-terminal punctuation
  if (/[.!?]$/.test(trimmed)) return 'sentence';
  // Count words (split by whitespace)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount === 1) return 'word';
  if (wordCount <= 5) return 'phrase';
  return 'sentence';
}
