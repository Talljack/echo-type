import type { ContentItem } from '@/types/content';

export interface WordBookWriteTarget {
  text: string;
  prompt: string;
}

export function resolveWordBookWriteTarget(item: ContentItem): WordBookWriteTarget {
  if (item.type === 'word' && item.title.trim()) {
    return {
      text: item.title,
      prompt: item.text,
    };
  }

  return {
    text: item.text,
    prompt: item.title,
  };
}

export function normalizeWordBookWriteText(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().toLowerCase();
}

export function normalizeWordBookWriteChar(char: string): string {
  return normalizeWordBookWriteText(char);
}

export function isWordBookWriteMatch(actual: string, expected: string): boolean {
  return normalizeWordBookWriteText(actual) === normalizeWordBookWriteText(expected);
}
