import type { ContentItem, Module } from './content';

export interface LearningUnit {
  id: string;
  title: string;
  kind: 'book' | 'collection' | 'media' | 'article' | 'vocabulary';
  sourceIds: string[];
  lessonIds: string[];
  difficulty?: ContentItem['difficulty'];
  source: ContentItem['source'];
  updatedAt: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  order: number;
  exercises: ContentItem[];
  modules: Module[];
  estimatedMinutes: number;
}
