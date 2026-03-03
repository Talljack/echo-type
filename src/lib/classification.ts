import type { ContentType, Difficulty } from '@/types/content';
import { parseAIJson } from './parse-ai-json';

export interface ClassificationResult {
  type: ContentType;
  difficulty: Difficulty;
  title: string;
  tags: string[];
}

interface ClassificationPayload {
  type?: string;
  difficulty?: string;
  title?: string;
  tags?: unknown;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'this',
  'from',
  'have',
  'your',
  'about',
  'into',
  'their',
  'they',
  'will',
  'would',
  'there',
  'what',
  'when',
  'where',
  'which',
  'while',
  'than',
  'then',
]);

function toContentType(value?: string): ContentType | null {
  if (!value) return null;
  if (['article', 'phrase', 'sentence', 'word'].includes(value)) {
    return value as ContentType;
  }
  return null;
}

function toDifficulty(value?: string): Difficulty | null {
  if (!value) return null;
  if (['beginner', 'intermediate', 'advanced'].includes(value)) {
    return value as Difficulty;
  }
  return null;
}

function deriveTitle(text: string, providedTitle?: string): string {
  if (providedTitle?.trim()) return providedTitle.trim();

  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return 'Imported Content';

  return firstLine.replace(/[.!?]+$/, '').slice(0, 60);
}

function deriveTags(text: string): string[] {
  const counts = new Map<string, number>();

  for (const token of text.toLowerCase().match(/[a-z]{3,}/g) ?? []) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function heuristicClassifyContent(text: string, providedTitle?: string): ClassificationResult {
  const normalizedText = text.trim();
  const words = normalizedText.match(/\b[\w'-]+\b/g) ?? [];
  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const sentences = normalizedText.split(/(?<=[.!?])\s+/).filter(Boolean);
  const hasGlossaryPattern = lines.every((line) => /^[-*]?\s*[A-Za-z][A-Za-z' -]+\s[-:]\s.+/.test(line));

  let type: ContentType = 'article';
  if (hasGlossaryPattern || (lines.length > 0 && lines.length <= 20 && words.length <= 80)) {
    type = 'word';
  } else if (sentences.length <= 2 && words.length <= 20) {
    type = 'phrase';
  } else if (sentences.length <= 8 && words.length <= 120) {
    type = 'sentence';
  }

  let difficulty: Difficulty = 'beginner';
  if (words.length > 120 || /\b(however|although|therefore|consequently|significant)\b/i.test(normalizedText)) {
    difficulty = 'advanced';
  } else if (words.length > 40 || /\b(probably|usually|instead|during|because)\b/i.test(normalizedText)) {
    difficulty = 'intermediate';
  }

  return {
    type,
    difficulty,
    title: deriveTitle(normalizedText, providedTitle),
    tags: deriveTags(normalizedText),
  };
}

export function normalizeClassificationResult(
  payload: ClassificationPayload | null | undefined,
  text: string,
  providedTitle?: string,
): ClassificationResult {
  const fallback = heuristicClassifyContent(text, providedTitle);

  const tags =
    Array.isArray(payload?.tags) && payload.tags.length > 0
      ? payload.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : fallback.tags;

  return {
    type: toContentType(payload?.type) ?? fallback.type,
    difficulty: toDifficulty(payload?.difficulty) ?? fallback.difficulty,
    title: payload?.title?.trim() || fallback.title,
    tags,
  };
}

export function parseClassificationResponse(raw: string, text: string, providedTitle?: string): ClassificationResult {
  const parsed = parseAIJson<ClassificationPayload>(raw);
  return normalizeClassificationResult(parsed.data, text, providedTitle);
}
