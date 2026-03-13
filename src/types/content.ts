// Core types shared across all modules

export interface ContentMetadata {
  sourceUrl?: string;
  timestamps?: Array<{
    offset: number;
    duration: number;
    text: string;
  }>;
  sourceFilename?: string;
  pageRange?: string;
  audioUrl?: string;
  platform?: string;
  videoDuration?: number;
}

export interface ContentItem {
  id: string;
  title: string;
  text: string;
  type: 'article' | 'phrase' | 'sentence' | 'word';
  category?: string;
  tags: string[];
  source: 'builtin' | 'imported' | 'ai-generated' | 'url-import';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  metadata?: ContentMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface MistakeEntry {
  position: number;
  expected: string;
  actual: string;
  timestamp: number;
}

export interface LearningRecord {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  attempts: number;
  correctCount: number;
  accuracy: number;
  wpm?: number;
  lastPracticed: number;
  nextReview?: number;
  mistakes: MistakeEntry[];
}

export interface TypingSession {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  startTime: number;
  endTime?: number;
  totalChars: number;
  correctChars: number;
  wrongChars: number;
  totalWords: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  description: string;
  chapterCount: number;
  totalWords: number;
  difficulty: Difficulty;
  tags: string[];
  source: 'imported' | 'builtin';
  coverEmoji: string;
  metadata?: {
    sourceFilename?: string;
    sourceUrl?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export type ContentType = ContentItem['type'];
export type ContentSource = ContentItem['source'];
export type Difficulty = NonNullable<ContentItem['difficulty']>;
export type Module = LearningRecord['module'];
