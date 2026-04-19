import type { FSRSCardData } from '@/lib/fsrs';

export interface RelatedData {
  synonyms?: string[];
  wordFamily?: { word: string; pos: string }[];
  relatedPhrases?: string[];
  keyVocabulary?: { word: string; translation: string }[];
}

export type FavoriteType = 'word' | 'phrase' | 'sentence';
export type FavoriteSourceModule = 'listen' | 'read' | 'write' | 'speak' | 'library' | 'chat';

export interface FavoriteItem {
  id: string;
  text: string;
  normalizedText: string;
  translation: string;
  type: FavoriteType;
  folderId: string;
  sourceContentId?: string;
  sourceModule?: FavoriteSourceModule;
  context?: string;
  targetLang: string;
  pronunciation?: string;
  notes?: string;
  related?: RelatedData;
  fsrsCard?: FSRSCardData;
  nextReview?: number;
  autoCollected: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  emoji: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
}

export const DEFAULT_FOLDERS: FavoriteFolder[] = [
  { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 0 },
  { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 0 },
];
