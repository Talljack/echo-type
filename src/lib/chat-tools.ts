import { tool } from 'ai';
import { z } from 'zod';
import { PROVIDER_IDS, type ProviderId } from '@/lib/providers';
import type { ContentType } from '@/types/content';

const NAVIGATION_PATHS = [
  '/dashboard',
  '/listen',
  '/speak',
  '/read',
  '/write',
  '/library',
  '/settings',
  '/review/today',
] as const;

const CONTENT_TYPES = ['article', 'phrase', 'sentence', 'word'] as const satisfies readonly ContentType[];
const GENERATION_TYPES = ['scenario', 'article', 'dialogue'] as const;
const EXERCISE_TYPES = ['translation', 'fill-blank', 'quiz', 'dictation'] as const;
const PRACTICE_MODULES = ['listen', 'speak', 'read', 'write'] as const;
const USER_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const PROVIDER_ID_VALUES = PROVIDER_IDS as [ProviderId, ...ProviderId[]];

export const CHAT_TOOL_INPUT_SCHEMAS = {
  navigate: z.object({
    path: z.enum(NAVIGATION_PATHS),
    reason: z.string().min(1),
  }),
  importYouTube: z.object({
    url: z.string().url(),
  }),
  importUrl: z.object({
    url: z.string().url(),
  }),
  addTextContent: z.object({
    title: z.string().min(1),
    text: z.string().min(1),
    type: z.enum(CONTENT_TYPES),
  }),
  generateContent: z.object({
    topic: z.string().min(1),
    words: z.array(z.string().min(1)).optional(),
    type: z.enum(GENERATION_TYPES),
  }),
  searchLibrary: z.object({
    query: z.string().min(1),
    type: z.enum(CONTENT_TYPES).optional(),
  }),
  searchWordBooks: z.object({
    query: z.string().min(1),
  }),
  loadContent: z.object({
    contentId: z.string().min(1),
  }),
  startExercise: z.object({
    type: z.enum(EXERCISE_TYPES),
  }),
  startPracticeSession: z.object({
    contentId: z.string().min(1),
    module: z.enum(PRACTICE_MODULES),
  }),
  speakText: z.object({
    text: z.string().min(1),
  }),
  showAnalytics: z.object({}),
  showTodaySessions: z.object({}),
  showTodayStats: z.object({}),
  showDueReviews: z.object({}),
  updateUserLevel: z.object({
    level: z.enum(USER_LEVELS),
  }),
  updateProviderConfig: z.object({
    providerId: z.enum(PROVIDER_ID_VALUES),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }),
};

export const CHAT_TOOL_NAMES = Object.keys(CHAT_TOOL_INPUT_SCHEMAS) as Array<keyof typeof CHAT_TOOL_INPUT_SCHEMAS>;

const CHAT_TOOL_DESCRIPTIONS: Record<keyof typeof CHAT_TOOL_INPUT_SCHEMAS, string> = {
  navigate: 'Navigate to an app page when the user asks to go somewhere inside EchoType.',
  importYouTube: 'Import a YouTube video transcript into the learning library when the user shares a YouTube URL.',
  importUrl: 'Import article text from a normal webpage URL into the learning library.',
  addTextContent: 'Save user-provided text directly into the learning library.',
  generateContent: 'Generate new English-learning content and save it to the library.',
  searchLibrary: 'Search the saved learning library for matching content.',
  searchWordBooks: 'Search the built-in word book catalog.',
  loadContent: 'Load a saved content item into the current chat practice context.',
  startExercise: 'Start an exercise on the currently loaded content.',
  startPracticeSession: 'Open a module and start practicing a specific content item.',
  speakText: 'Read text aloud using text-to-speech.',
  showAnalytics: 'Collect a learning analytics snapshot for the current user.',
  showTodaySessions: 'Show today’s completed practice sessions.',
  showTodayStats: 'Show today’s aggregated learning stats.',
  showDueReviews: 'Show due review items that should be practiced today.',
  updateUserLevel: 'Update the user’s CEFR level setting.',
  updateProviderConfig: 'Update provider settings such as API key, model, or base URL.',
};

export function createChatTools() {
  return Object.fromEntries(
    CHAT_TOOL_NAMES.map((toolName) => [
      toolName,
      tool({
        description: CHAT_TOOL_DESCRIPTIONS[toolName],
        inputSchema: CHAT_TOOL_INPUT_SCHEMAS[toolName] as never,
      }),
    ]),
  );
}

const MOBILE_TOOL_NAMES = ['searchLibrary', 'suggestContent', 'translateText'] as const;

export const MOBILE_TOOL_INPUT_SCHEMAS = {
  searchLibrary: CHAT_TOOL_INPUT_SCHEMAS.searchLibrary,
  suggestContent: z.object({
    topic: z.string().min(1),
    type: z.enum(['word', 'phrase', 'sentence', 'article']),
  }),
  translateText: z.object({
    text: z.string().min(1),
  }),
} as const;

const MOBILE_TOOL_DESCRIPTIONS: Record<(typeof MOBILE_TOOL_NAMES)[number], string> = {
  searchLibrary: 'Search the user library for content matching a query.',
  suggestContent: 'Suggest content from the user library to practice for a topic.',
  translateText: "Translate text to the user's target study language (client-side).",
};

/** Client-executed tools for the Expo app (`toolSuite: 'mobile'` on `/api/chat`). */
export function createMobileChatTools() {
  return Object.fromEntries(
    MOBILE_TOOL_NAMES.map((toolName) => [
      toolName,
      tool({
        description: MOBILE_TOOL_DESCRIPTIONS[toolName],
        inputSchema: MOBILE_TOOL_INPUT_SCHEMAS[toolName] as never,
      }),
    ]),
  );
}

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];
