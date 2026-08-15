'use client';

import { db } from '@/lib/db';
import { cardToData, createNewCard } from '@/lib/fsrs';
import { useProviderStore } from '@/stores/provider-store';
import type { BookItem, CollectionItem, ContentItem, LearningRecord, TypingSession } from '@/types/content';
import type { FavoriteItem } from '@/types/favorite';

const QA_QUERY_KEY = 'nativeQA';
const QA_APPLIED_PREFIX = 'echotype_ios_native_qa_applied_';
const QA_DATASET_VERSION = 'v2';
const FAVORITE_SETTINGS_KEY = 'echotype_favorite_settings';
const SPEAK_CONVERSATION_STORAGE_KEY = 'echotype_speak_conversations';
const SPEAK_MOCK_KEY = 'echotype_native_qa_speak_mock';
const SPEAK_VOICE_KEY = 'echotype_native_qa_voice_transcript';
const READ_VOICE_KEY = 'echotype_native_qa_read_transcript';
const FAVORITE_FOLDERS_KEY = 'echotype_favorite_folders_seeded_v1';
const DEFAULT_FOLDERS = [
  { id: 'default', name: '默认收藏', emoji: '⭐', sortOrder: 0, createdAt: 0 },
  { id: 'auto', name: '智能收藏', emoji: '🤖', sortOrder: 1, createdAt: 0 },
] as const;

export const IOS_NATIVE_QA_IMPORT_ITEM_ID = 'ios-qa-import-item';
export const IOS_NATIVE_QA_REVIEW_ITEM_ID = 'ios-qa-review-item';
export const IOS_NATIVE_QA_REVIEW_RECORD_ID = 'ios-qa-review-record';
export const IOS_NATIVE_QA_FAVORITE_ID = 'ios-qa-favorite-item';
export const IOS_NATIVE_QA_BOOK_ID = 'ios-qa-book';
export const IOS_NATIVE_QA_COLLECTION_ID = 'ios-qa-collection';

const IOS_NATIVE_QA_IMPORT_ITEM: ContentItem = {
  id: IOS_NATIVE_QA_IMPORT_ITEM_ID,
  title: 'iOS QA Practice Line',
  text: 'native shell practice check',
  type: 'sentence',
  category: 'ios-native-qa',
  tags: ['ios-qa', 'imported'],
  source: 'imported',
  difficulty: 'beginner',
  createdAt: 0,
  updatedAt: 0,
};

const IOS_NATIVE_QA_REVIEW_ITEM: ContentItem = {
  id: IOS_NATIVE_QA_REVIEW_ITEM_ID,
  title: 'iOS QA Review Line',
  text: 'review rating loop',
  type: 'sentence',
  category: 'ios-native-qa',
  tags: ['ios-qa', 'review'],
  source: 'imported',
  difficulty: 'beginner',
  createdAt: 0,
  updatedAt: 0,
};

type NativeQAMode =
  | 'deep-flows'
  | 'dashboard-rich'
  | 'import-practice'
  | 'favorites-empty'
  | 'favorites-populated'
  | 'review-due'
  | 'speak-free'
  | 'weak-spots-rich'
  | 'library-nested'
  | 'collection-generate';

export interface IOSNativeQAEdgeVoice {
  id: string;
  name: string;
  locale: string;
  gender: string;
  personalities?: string[];
}

function isLocalNativeQAHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === '127.0.0.1' || host === 'localhost';
}

export function getIOSNativeQAMode(): NativeQAMode | null {
  if (typeof window === 'undefined' || !isLocalNativeQAHost()) return null;
  const value = new URLSearchParams(window.location.search).get(QA_QUERY_KEY);
  switch (value) {
    case 'deep-flows':
    case 'dashboard-rich':
    case 'import-practice':
    case 'favorites-empty':
    case 'favorites-populated':
    case 'review-due':
    case 'speak-free':
    case 'weak-spots-rich':
    case 'library-nested':
    case 'collection-generate':
      return value;
    default:
      return null;
  }
}

export function isIOSNativeQAEnabled() {
  return getIOSNativeQAMode() != null;
}

export function isIOSNativeQASpeakMockEnabled() {
  const mode = getIOSNativeQAMode();
  return mode === 'deep-flows' || mode === 'speak-free';
}

export function getIOSNativeQAVoiceTranscript() {
  if (typeof window === 'undefined') return 'This is a mocked voice message';
  return window.localStorage.getItem(SPEAK_VOICE_KEY) || 'This is a mocked voice message';
}

export function getIOSNativeQAReadTranscript() {
  if (typeof window === 'undefined') return IOS_NATIVE_QA_IMPORT_ITEM.text;
  return window.localStorage.getItem(READ_VOICE_KEY) || IOS_NATIVE_QA_IMPORT_ITEM.text;
}

export function getIOSNativeQASpeakReply(userText: string) {
  return `Mocked iOS reply: ${userText}`;
}

function normalizeNativeQATranslationText(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '练习内容';
  if (compact.length <= 36) return compact;
  return `${compact.slice(0, 36)}…`;
}

export function getIOSNativeQAMockTranslation(text: string, targetLang: string) {
  const prefix = targetLang.toLowerCase().startsWith('zh') ? '练习' : 'Practice';
  return `${prefix}：${normalizeNativeQATranslationText(text)}`;
}

export function getIOSNativeQAMockTranslations(sentences: string[], targetLang: string) {
  return sentences.map((sentence) => getIOSNativeQAMockTranslation(sentence, targetLang));
}

export function getIOSNativeQAMockEdgeVoices(): IOSNativeQAEdgeVoice[] {
  return [
    {
      id: 'en-US-AriaNeural',
      name: 'Aria',
      locale: 'en-US',
      gender: 'Female',
      personalities: ['Friendly', 'Clear'],
    },
    {
      id: 'en-US-GuyNeural',
      name: 'Guy',
      locale: 'en-US',
      gender: 'Male',
      personalities: ['Warm', 'Confident'],
    },
    {
      id: 'en-GB-SoniaNeural',
      name: 'Sonia',
      locale: 'en-GB',
      gender: 'Female',
      personalities: ['Calm', 'Precise'],
    },
  ];
}

async function ensureFavoriteFolders() {
  const existing = await db.favoriteFolders.count();
  if (existing > 0) return;
  const now = Date.now();
  await db.favoriteFolders.bulkAdd(DEFAULT_FOLDERS.map((folder) => ({ ...folder, createdAt: now })));
  window.localStorage.setItem(FAVORITE_FOLDERS_KEY, 'true');
}

async function upsertContentItem(template: ContentItem) {
  const now = Date.now();
  const existing = await db.contents.get(template.id);
  await db.contents.put({
    ...template,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

async function seedImportPracticeContent() {
  await upsertContentItem(IOS_NATIVE_QA_IMPORT_ITEM);
}

async function seedReviewItem() {
  await upsertContentItem(IOS_NATIVE_QA_REVIEW_ITEM);

  const now = Date.now();
  const due = now - 60_000;
  const fsrsCard = cardToData(createNewCard(new Date(due)));
  fsrsCard.due = due;

  const record: LearningRecord = {
    id: IOS_NATIVE_QA_REVIEW_RECORD_ID,
    contentId: IOS_NATIVE_QA_REVIEW_ITEM_ID,
    module: 'write',
    attempts: 2,
    correctCount: IOS_NATIVE_QA_REVIEW_ITEM.text.length,
    accuracy: 100,
    wpm: 42,
    lastPracticed: due,
    nextReview: due,
    fsrsCard,
    mistakes: [],
  };

  await db.records.put(record);
}

async function seedFavoriteItem() {
  await ensureFavoriteFolders();
  const now = Date.now();
  const due = now - 60_000;
  const fsrsCard = cardToData(createNewCard(new Date(due)));
  fsrsCard.due = due;

  const favorite: FavoriteItem = {
    id: IOS_NATIVE_QA_FAVORITE_ID,
    text: 'native shell',
    normalizedText: 'native shell',
    translation: '原生壳',
    type: 'phrase',
    folderId: 'default',
    sourceModule: 'library',
    sourceContentId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
    context: 'The iOS native shell should preserve the full learning flow.',
    targetLang: 'zh-CN',
    notes: 'Used for deterministic iOS QA.',
    fsrsCard,
    nextReview: due,
    autoCollected: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.favorites.put(favorite);
}

async function seedDashboardSessions() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sessions: TypingSession[] = [
    {
      id: 'ios-qa-dashboard-listen-session',
      contentId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
      module: 'listen',
      startTime: now - oneDay * 2,
      endTime: now - oneDay * 2 + 4 * 60 * 1000,
      totalChars: IOS_NATIVE_QA_IMPORT_ITEM.text.length,
      correctChars: 0,
      wrongChars: 0,
      totalWords: 4,
      wpm: 0,
      accuracy: 100,
      completed: true,
    },
    {
      id: 'ios-qa-dashboard-read-session',
      contentId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
      module: 'read',
      startTime: now - oneDay,
      endTime: now - oneDay + 5 * 60 * 1000,
      totalChars: IOS_NATIVE_QA_IMPORT_ITEM.text.length,
      correctChars: 3,
      wrongChars: 1,
      totalWords: 4,
      wpm: 0,
      accuracy: 88,
      completed: true,
    },
    {
      id: 'ios-qa-dashboard-write-session',
      contentId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
      module: 'write',
      startTime: now - 4 * 60 * 60 * 1000,
      endTime: now - 4 * 60 * 60 * 1000 + 2 * 60 * 1000,
      totalChars: IOS_NATIVE_QA_IMPORT_ITEM.text.length,
      correctChars: IOS_NATIVE_QA_IMPORT_ITEM.text.length - 1,
      wrongChars: 1,
      totalWords: 4,
      wpm: 36,
      accuracy: 96,
      completed: true,
    },
    {
      id: 'ios-qa-dashboard-speak-session',
      contentId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
      module: 'speak',
      startTime: now - 90 * 60 * 1000,
      endTime: now - 84 * 60 * 1000,
      totalChars: 18,
      correctChars: 18,
      wrongChars: 0,
      totalWords: 4,
      wpm: 48,
      accuracy: 100,
      completed: true,
    },
  ];

  await db.sessions.bulkPut(sessions);
}

async function clearDynamicTables() {
  await Promise.all([
    db.records.clear(),
    db.sessions.clear(),
    db.favorites.clear(),
    db.favoriteFolders.clear(),
    db.conversations.clear(),
    db.weakSpots.clear(),
  ]);
}

function clearDynamicStorage() {
  window.localStorage.removeItem(SPEAK_CONVERSATION_STORAGE_KEY);
  window.localStorage.removeItem(SPEAK_MOCK_KEY);
  window.localStorage.removeItem(SPEAK_VOICE_KEY);
  window.localStorage.removeItem(READ_VOICE_KEY);
  window.localStorage.removeItem(FAVORITE_SETTINGS_KEY);

  const reviewBaselineKeys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith('echotype_review_baseline_')) {
      reviewBaselineKeys.push(key);
    }
  }
  reviewBaselineKeys.forEach((key) => window.sessionStorage.removeItem(key));
}

function primeDashboardProvider() {
  const store = useProviderStore.getState();
  store.setAuth('openai', {
    type: 'api-key',
    apiKey: 'ios-native-qa-key',
  });
  store.setSelectedModel('openai', 'gpt-4o-mini');
  store.setActiveProvider('openai');
}

function primeSpeakMocks() {
  window.localStorage.setItem(SPEAK_MOCK_KEY, '1');
  window.localStorage.setItem(SPEAK_VOICE_KEY, 'This is a mocked voice message');
}

function primeReadMocks() {
  window.localStorage.setItem(READ_VOICE_KEY, IOS_NATIVE_QA_IMPORT_ITEM.text);
}

async function seedImportedBook() {
  const now = Date.now();
  const book: BookItem = {
    id: IOS_NATIVE_QA_BOOK_ID,
    title: 'iOS QA Story Pack',
    author: 'EchoType QA',
    description: 'Deterministic imported book used for iOS native validation.',
    chapterCount: 3,
    totalWords: 27,
    difficulty: 'beginner',
    tags: ['ios-qa', 'book'],
    source: 'imported',
    coverEmoji: '📘',
    createdAt: now,
    updatedAt: now,
  };

  const chapters: ContentItem[] = [
    {
      id: 'ios-qa-book-ch-1',
      title: 'Chapter 1',
      text: 'This is the first deterministic chapter for iOS native validation.',
      type: 'article',
      category: `book-${IOS_NATIVE_QA_BOOK_ID}`,
      tags: ['ios-qa', 'book', IOS_NATIVE_QA_BOOK_ID],
      source: 'imported',
      difficulty: 'beginner',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ios-qa-book-ch-2',
      title: 'Chapter 2',
      text: 'This chapter confirms imported books still work inside the iPhone shell.',
      type: 'article',
      category: `book-${IOS_NATIVE_QA_BOOK_ID}`,
      tags: ['ios-qa', 'book', IOS_NATIVE_QA_BOOK_ID],
      source: 'imported',
      difficulty: 'beginner',
      createdAt: now + 1,
      updatedAt: now + 1,
    },
    {
      id: 'ios-qa-book-ch-3',
      title: 'Chapter 3',
      text: 'Learners can jump from a seeded book into every practice module reliably.',
      type: 'article',
      category: `book-${IOS_NATIVE_QA_BOOK_ID}`,
      tags: ['ios-qa', 'book', IOS_NATIVE_QA_BOOK_ID],
      source: 'imported',
      difficulty: 'beginner',
      createdAt: now + 2,
      updatedAt: now + 2,
    },
  ];

  await db.books.put(book);
  await db.contents.bulkPut(chapters);
}

async function seedCollection() {
  const now = Date.now();
  const items: ContentItem[] = [
    {
      id: 'ios-qa-collection-item-1',
      title: 'I need to reschedule my appointment.',
      text: 'I need to reschedule my appointment.',
      type: 'sentence',
      category: `collection:${IOS_NATIVE_QA_COLLECTION_ID}`,
      tags: ['ios-qa', 'collection', 'appointments'],
      source: 'ai-generated',
      difficulty: 'intermediate',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ios-qa-collection-item-2',
      title: 'What time works best for you?',
      text: 'What time works best for you?',
      type: 'sentence',
      category: `collection:${IOS_NATIVE_QA_COLLECTION_ID}`,
      tags: ['ios-qa', 'collection', 'appointments'],
      source: 'ai-generated',
      difficulty: 'intermediate',
      createdAt: now + 1,
      updatedAt: now + 1,
    },
    {
      id: 'ios-qa-collection-item-3',
      title: 'Could we move it to Friday morning?',
      text: 'Could we move it to Friday morning?',
      type: 'sentence',
      category: `collection:${IOS_NATIVE_QA_COLLECTION_ID}`,
      tags: ['ios-qa', 'collection', 'appointments'],
      source: 'ai-generated',
      difficulty: 'intermediate',
      createdAt: now + 2,
      updatedAt: now + 2,
    },
  ];

  const collection: CollectionItem = {
    id: IOS_NATIVE_QA_COLLECTION_ID,
    title: 'Rescheduling Meetings',
    titleZh: '改约与改期',
    description: 'Useful phrases for changing plans and moving appointments.',
    descriptionZh: '用于调整时间和改期的实用表达。',
    scenario: 'Rescheduling meetings and appointments',
    category: 'work',
    difficulty: 'intermediate',
    icon: '📅',
    itemIds: items.map((item) => item.id),
    tags: ['ios-qa', 'appointments', 'reschedule'],
    source: 'ai-generated',
    createdAt: now,
    updatedAt: now,
  };

  await db.contents.bulkPut(items);
  await db.collections.put(collection);
}

async function seedWeakSpots() {
  const now = Date.now();
  await seedImportPracticeContent();
  await db.weakSpots.bulkPut([
    {
      id: 'ios-qa-weak-spot-listen',
      module: 'listen',
      weakSpotType: 'dictation-sentence',
      sourceId: IOS_NATIVE_QA_IMPORT_ITEM_ID,
      sourceType: 'content',
      text: 'native shell practice check',
      normalizedText: 'native shell practice check',
      reason: 'Dictation accuracy dipped on the latest attempt.',
      count: 3,
      lastSeenAt: now,
      targetHref: `/listen/${IOS_NATIVE_QA_IMPORT_ITEM_ID}`,
      resolved: false,
      accuracy: 62,
    },
    {
      id: 'ios-qa-weak-spot-speak',
      module: 'speak',
      weakSpotType: 'pronunciation-phrase',
      sourceId: 'cet4',
      sourceType: 'content',
      text: 'opportunity',
      normalizedText: 'opportunity',
      reason: 'Pronunciation confidence is below target.',
      count: 2,
      lastSeenAt: now - 60_000,
      targetHref: '/speak/book/cet4',
      resolved: false,
      accuracy: 71,
    },
  ]);
}

export async function hydrateIOSNativeQA() {
  const mode = getIOSNativeQAMode();
  if (!mode) return;

  const appliedKey = `${QA_APPLIED_PREFIX}${mode}_${QA_DATASET_VERSION}`;
  const legacyKeyPrefix = `${QA_APPLIED_PREFIX}${mode}`;
  const existingKeysToClear: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(legacyKeyPrefix) && key !== appliedKey) {
      existingKeysToClear.push(key);
    }
  }
  existingKeysToClear.forEach((key) => window.sessionStorage.removeItem(key));
  clearDynamicStorage();
  await clearDynamicTables();
  await ensureFavoriteFolders();

  switch (mode) {
    case 'deep-flows':
      await seedImportPracticeContent();
      await seedReviewItem();
      await seedFavoriteItem();
      primeSpeakMocks();
      primeReadMocks();
      break;
    case 'dashboard-rich':
      await seedImportPracticeContent();
      await seedReviewItem();
      await seedFavoriteItem();
      await seedDashboardSessions();
      primeSpeakMocks();
      primeReadMocks();
      primeDashboardProvider();
      break;
    case 'import-practice':
      await seedImportPracticeContent();
      primeReadMocks();
      break;
    case 'favorites-empty':
      break;
    case 'favorites-populated':
      await seedImportPracticeContent();
      await seedFavoriteItem();
      break;
    case 'review-due':
      await seedReviewItem();
      break;
    case 'speak-free':
      primeSpeakMocks();
      break;
    case 'weak-spots-rich':
      await seedWeakSpots();
      primeSpeakMocks();
      primeReadMocks();
      break;
    case 'library-nested':
      await seedImportedBook();
      await seedCollection();
      primeSpeakMocks();
      primeReadMocks();
      break;
    case 'collection-generate':
      primeDashboardProvider();
      break;
  }

  window.sessionStorage.setItem(appliedKey, '1');
}
