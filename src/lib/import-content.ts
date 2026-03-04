import type { ContentType } from '@/types/content';

export function inferImportedContentType(text: string): ContentType {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 1) return 'word';
  if (words.length <= 6) return 'phrase';
  if (words.length <= 25) return 'sentence';
  return 'article';
}
