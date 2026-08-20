import Dexie, { type Table } from 'dexie';
import type { WordTimestamp } from '@/lib/word-alignment';
import type { Conversation } from '@/types/chat';
import type { BookItem, CollectionItem, ContentItem, LearningRecord, TypingSession } from '@/types/content';
import type { FavoriteFolder, FavoriteItem, LookupEntry } from '@/types/favorite';
import type { JournalEntry } from '@/types/journal';
import type { WeakSpot } from '@/types/weak-spot';

export interface TranslationCacheEntry {
  key: string;
  translations: { original: string; translation: string }[];
  createdAt: number;
}

export interface MediaBlobEntry {
  contentId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

export interface AlignmentCacheEntry {
  cacheKey: string;
  timestamps: WordTimestamp[];
  duration: number;
  createdAt: number;
}

class EchoTypeDB extends Dexie {
  contents!: Table<ContentItem>;
  records!: Table<LearningRecord>;
  sessions!: Table<TypingSession>;
  books!: Table<BookItem>;
  conversations!: Table<Conversation>;
  favorites!: Table<FavoriteItem>;
  favoriteFolders!: Table<FavoriteFolder>;
  lookupHistory!: Table<LookupEntry>;
  translationCache!: Table<TranslationCacheEntry>;
  mediaBlobs!: Table<MediaBlobEntry>;
  alignmentCache!: Table<AlignmentCacheEntry>;
  collections!: Table<CollectionItem>;
  weakSpots!: Table<WeakSpot>;
  journals!: Table<JournalEntry>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      contents: 'id, type, category, source, difficulty, createdAt',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, startTime, completed',
    });
    this.version(2).stores({
      contents: 'id, type, category, source, difficulty, createdAt',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, startTime, completed',
    });
    this.version(3).stores({
      contents: 'id, type, category, source, difficulty, createdAt',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, module, startTime, completed',
    });
    this.version(4).stores({
      contents: 'id, type, category, source, difficulty, createdAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, module, startTime, completed',
    });
    this.version(5).stores({
      contents: 'id, type, category, source, difficulty, createdAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
    });
    this.version(6).stores({
      contents: 'id, type, category, source, difficulty, createdAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
    });
    this.version(7)
      .stores({
        contents: 'id, type, category, source, difficulty, createdAt, *tags',
        records: 'id, contentId, module, lastPracticed, nextReview',
        sessions: 'id, contentId, module, startTime, completed',
        books: 'id, title, source, createdAt',
        conversations: 'id, updatedAt, createdAt',
      })
      .upgrade(async (tx) => {
        const { migrateToFSRS } = await import('@/lib/fsrs');
        await tx
          .table('records')
          .toCollection()
          .modify((record) => {
            if (!record.fsrsCard) {
              record.fsrsCard = migrateToFSRS(record.nextReview, record.lastPracticed, record.attempts);
            }
          });
      });

    // Version 8: add updatedAt index for cloud sync
    this.version(8)
      .stores({
        contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
        records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
        sessions: 'id, contentId, module, startTime, completed',
        books: 'id, title, source, createdAt',
        conversations: 'id, updatedAt, createdAt',
      })
      .upgrade(async (tx) => {
        // Back-fill updatedAt for contents that don't already have it
        await tx
          .table('contents')
          .toCollection()
          .modify((item) => {
            if (!item.updatedAt) {
              item.updatedAt = item.createdAt ?? Date.now();
            }
          });
        // Back-fill updatedAt for records (use lastPracticed as fallback)
        await tx
          .table('records')
          .toCollection()
          .modify((record) => {
            if (!record.updatedAt) {
              record.updatedAt = record.lastPracticed ?? Date.now();
            }
          });
      });

    // Version 9: add favorites, favoriteFolders, lookupHistory tables
    this.version(9).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
    });

    // Version 10: add translationCache table for persistent translation caching
    this.version(10).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
    });

    // Version 11: add mediaBlobs table for persistent local audio storage
    this.version(11).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
    });

    // Version 12: add alignmentCache table for word-level TTS alignment
    this.version(12).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
      alignmentCache: 'cacheKey, createdAt',
    });

    // Version 13: add weak spots table
    this.version(13).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
      alignmentCache: 'cacheKey, createdAt',
      weakSpots: 'id, module, weakSpotType, normalizedText, lastSeenAt, resolved, [module+weakSpotType+normalizedText]',
    });

    // Version 14: add collections table for scenario-based content grouping
    this.version(14).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
      alignmentCache: 'cacheKey, createdAt',
      weakSpots: 'id, module, weakSpotType, normalizedText, lastSeenAt, resolved, [module+weakSpotType+normalizedText]',
      collections: 'id, category, source, difficulty, createdAt, updatedAt, *tags',
    });

    // Version 15: add journals table for dialogue notebook / learning journal
    this.version(15).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
      alignmentCache: 'cacheKey, createdAt',
      weakSpots: 'id, module, weakSpotType, normalizedText, lastSeenAt, resolved, [module+weakSpotType+normalizedText]',
      collections: 'id, category, source, difficulty, createdAt, updatedAt, *tags',
      journals: 'id, lessonDate, source, updatedAt, *tags',
    });

    this.version(16).stores({
      contents: 'id, type, category, source, difficulty, createdAt, updatedAt, deletedAt, *tags',
      records: 'id, contentId, module, lastPracticed, nextReview, updatedAt',
      sessions: 'id, contentId, module, startTime, completed',
      books: 'id, title, source, createdAt',
      conversations: 'id, updatedAt, createdAt',
      favorites:
        'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt',
      favoriteFolders: 'id, sortOrder, createdAt',
      lookupHistory: 'text, count, lastLookedUp',
      translationCache: 'key, createdAt',
      mediaBlobs: 'contentId, createdAt',
      alignmentCache: 'cacheKey, createdAt',
      weakSpots: 'id, module, weakSpotType, normalizedText, lastSeenAt, resolved, [module+weakSpotType+normalizedText]',
      collections: 'id, category, source, difficulty, createdAt, updatedAt, *tags',
      journals: 'id, lessonDate, source, updatedAt, *tags',
    });

    // Dexie hooks: auto-set updatedAt on create/update for contents and records
    this.contents.hook('creating', (_primKey, obj) => {
      const now = Date.now();
      if (!obj.updatedAt) obj.updatedAt = now;
      if (!obj.createdAt) obj.createdAt = now;
    });

    this.contents.hook('updating', (modifications) => {
      if (!('updatedAt' in modifications)) {
        return { ...modifications, updatedAt: Date.now() };
      }
      return undefined;
    });

    this.records.hook('creating', (_primKey, obj) => {
      if (!obj.lastPracticed) obj.lastPracticed = Date.now();
    });

    this.records.hook('updating', (modifications) => {
      if ('lastPracticed' in modifications || 'attempts' in modifications || 'accuracy' in modifications) {
        if (!('lastPracticed' in modifications)) {
          return { ...modifications, lastPracticed: Date.now() };
        }
      }
      return undefined;
    });

    this.favorites.hook('creating', (_primKey, obj) => {
      const now = Date.now();
      if (!obj.updatedAt) obj.updatedAt = now;
      if (!obj.createdAt) obj.createdAt = now;
    });

    this.favorites.hook('updating', (modifications) => {
      if (!('updatedAt' in modifications)) {
        return { ...modifications, updatedAt: Date.now() };
      }
      return undefined;
    });

    this.journals.hook('creating', (_primKey, obj) => {
      const now = Date.now();
      if (!obj.updatedAt) obj.updatedAt = now;
      if (!obj.createdAt) obj.createdAt = now;
    });

    this.journals.hook('updating', (modifications) => {
      if (!('updatedAt' in modifications)) {
        return { ...modifications, updatedAt: Date.now() };
      }
      return undefined;
    });
  }
}

export const LOCAL_DATABASE_CHANGED_EVENT = 'echotype:local-database-changed';

export function getDatabaseNameForUser(userId: string | null): string {
  return userId ? `echotype:user:${userId}` : 'echotype:anonymous';
}

let activeUserId: string | null = null;
export let db = new EchoTypeDB(getDatabaseNameForUser(activeUserId));

export async function switchDatabaseForUser(userId: string | null): Promise<void> {
  if (activeUserId === userId) return;

  db.close();
  activeUserId = userId;
  db = new EchoTypeDB(getDatabaseNameForUser(userId));
  await db.open();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_DATABASE_CHANGED_EVENT, { detail: { userId } }));
  }
}
