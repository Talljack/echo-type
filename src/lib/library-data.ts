import type { ContentItem, ContentType } from '@/types/content';

export function groupLibraryContent(items: ContentItem[]): Record<ContentType, ContentItem[]> {
  const groups: Record<ContentType, ContentItem[]> = { word: [], phrase: [], sentence: [], article: [] };

  for (const item of items) {
    if (item.deletedAt || (item.type === 'article' && item.category?.startsWith('book-'))) continue;
    groups[item.type].push(item);
  }

  return groups;
}
