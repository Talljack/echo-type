export type WeakSpotType =
  | 'listening-segment'
  | 'dictation-sentence'
  | 'pronunciation-phrase'
  | 'reading-phrase'
  | 'typing-word'
  | 'favorite-item';

export interface WeakSpot {
  id: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  weakSpotType: WeakSpotType;
  sourceId: string;
  sourceType: 'content' | 'session' | 'favorite';
  text: string;
  normalizedText: string;
  reason: string;
  count: number;
  lastSeenAt: number;
  targetHref: string;
  resolved: boolean;
  accuracy?: number;
}
