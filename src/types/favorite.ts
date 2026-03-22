import type { FSRSCardData } from '@/types/content';

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

export interface LookupEntry {
  text: string;
  count: number;
  lastLookedUp: number;
}

export type AutoCollectSensitivity = 'low' | 'medium' | 'high';

export interface AutoCollectSettings {
  enabled: boolean;
  sensitivity: AutoCollectSensitivity;
  dailyCap: number;
}

export const DEFAULT_FOLDERS: FavoriteFolder[] = [
  { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 0 },
  { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 0 },
];

export const SENSITIVITY_THRESHOLDS = {
  low: { writeErrorRate: 0.7, fsrsAgainCount: 3, lookupCount: 5 },
  medium: { writeErrorRate: 0.5, fsrsAgainCount: 2, lookupCount: 3 },
  high: { writeErrorRate: 0.3, fsrsAgainCount: 1, lookupCount: 2 },
} as const;
