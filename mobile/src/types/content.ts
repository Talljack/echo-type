export type ContentType = 'article' | 'video' | 'audio' | 'book' | 'conversation';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  content: string;
  language: string;
  difficulty: DifficultyLevel;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  coverImage?: string;
  duration?: number;
  wordCount?: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  isFavorite: boolean;
  progress: number;
  metadata?: Record<string, any>;
}

export interface LearningRecord {
  id: string;
  contentId: string;
  moduleType: 'listen' | 'speak' | 'read' | 'write';
  startTime: number;
  endTime?: number;
  duration: number;
  accuracy?: number;
  wpm?: number;
  mistakes?: number;
  completedSentences: number;
  totalSentences: number;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface TypingSession {
  id: string;
  contentId: string;
  moduleType: 'listen' | 'speak' | 'read' | 'write';
  startTime: number;
  endTime?: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  accuracy: number;
  wpm: number;
  duration: number;
  keystrokes: any[];
  createdAt: number;
}

export interface Book {
  id: string;
  contentId: string;
  word: string;
  translation?: string;
  context?: string;
  notes?: string;
  masteryLevel: number;
  reviewCount: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: any[];
  model: string;
  language: string;
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  id: string;
  contentId: string;
  folderId?: string;
  createdAt: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}
