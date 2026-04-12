// Storage types for AsyncStorage persistence

export interface Content {
  id: string;
  title: string;
  text: string;
  translation?: string;
  source: 'url' | 'youtube' | 'pdf' | 'text' | 'ai';
  sourceUrl?: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    author?: string;
    duration?: number; // for audio/video
    wordCount?: number;
    thumbnailUrl?: string;
  };
}

export interface LearningRecord {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';

  // FSRS fields
  state: 'new' | 'learning' | 'review' | 'relearning';
  difficulty: number;
  stability: number;
  retrievability: number;
  lastReview: number;
  nextReview: number;
  lapses: number;
  reps: number;

  createdAt: number;
  updatedAt: number;
}

export interface TypingSession {
  id: string;
  contentId: string;
  text: string;
  userInput: string;
  wpm: number;
  accuracy: number;
  errors: Array<{
    position: number;
    expected: string;
    actual: string;
  }>;
  duration: number; // seconds
  completedAt: number;
}

export interface Favorite {
  id: string;
  contentId: string;
  word: string;
  translation?: string;
  context?: string;
  folderId?: string;
  createdAt: number;
}

export interface FavoriteFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  contentIds: string[]; // chapters
  currentChapter: number;
  progress: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  contents: Content[];
  learningRecords: LearningRecord[];
  typingSessions: TypingSession[];
  favorites: Favorite[];
  favoriteFolders: FavoriteFolder[];
  books: Book[];
  conversations: Conversation[];
}

export const INITIAL_APP_DATA: AppData = {
  contents: [],
  learningRecords: [],
  typingSessions: [],
  favorites: [],
  favoriteFolders: [],
  books: [],
  conversations: [],
};
