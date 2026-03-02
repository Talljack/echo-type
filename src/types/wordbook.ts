import type { ContentItem } from './content';

export interface WordBook {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  kind: 'vocabulary' | 'scenario';
  emoji: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  filterTag: string;
  tags: string[];
  items: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>[];
}
