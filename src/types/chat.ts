import type { UIMessage } from 'ai';
import type { ContentType } from '@/types/content';

// ─── Chat Modes & Exercise Types ────────────────────────────────────────────

export type ChatMode = 'general' | 'practice' | 'reading' | 'analytics' | 'search';
export type ExerciseType = 'translation' | 'fill-blank' | 'quiz' | 'dictation';

// ─── Rich Block Types ───────────────────────────────────────────────────────

export interface AudioBlock {
  type: 'audio';
  text: string;
  label?: string;
}

export interface QuizBlock {
  type: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface FillBlankBlock {
  type: 'fill-blank';
  sentence: string; // use ___ for blanks
  answers: string[];
  hints?: string[];
}

export interface TranslationBlock {
  type: 'translation';
  source: string;
  sourceLang: string;
  target: string;
  targetLang: string;
}

export interface VocabBlock {
  type: 'vocab';
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  example?: string;
}

export interface ReadingBlock {
  type: 'reading';
  title?: string;
  segments: {
    id: string;
    text: string;
    translation?: string;
  }[];
}

export interface AnalyticsBlock {
  type: 'analytics';
  stats: {
    label: string;
    value: string | number;
    change?: string;
    icon?: string;
  }[];
}

export interface ResourceBlock {
  type: 'resource';
  title: string;
  description?: string;
  url?: string;
  difficulty?: string;
  resourceType?: string;
}

export type RichBlock =
  | AudioBlock
  | QuizBlock
  | FillBlankBlock
  | TranslationBlock
  | VocabBlock
  | ReadingBlock
  | AnalyticsBlock
  | ResourceBlock;

// ─── Chat Message ───────────────────────────────────────────────────────────

export interface ChatMessageMetadata {
  contentId?: string;
  exerciseType?: ExerciseType;
  exerciseData?: Record<string, unknown>;
  analyticsSnapshot?: Record<string, unknown>;
  richBlocks?: RichBlock[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: ChatMessageMetadata;
}

export type ChatUIMessage = UIMessage;

export interface ToolCallResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatUIMessage[];
  chatMode: ChatMode;
  activeContentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─── Chat Context (sent to API) ─────────────────────────────────────────────

export interface ChatContext {
  module?: string;
  contentTitle?: string;
  contentText?: string;
  contentType?: ContentType;
  chatMode?: ChatMode;
  exerciseType?: ExerciseType;
  exercisePrompt?: string;
  analyticsData?: Record<string, unknown>;
}

// ─── Panel Size ─────────────────────────────────────────────────────────────

export type PanelSize = 'compact' | 'expanded';
