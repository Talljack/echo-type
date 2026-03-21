import Dexie, { type Table } from 'dexie';
import type { Conversation } from '@/types/chat';
import type { BookItem, ContentItem, LearningRecord, TypingSession } from '@/types/content';

class EchoTypeDB extends Dexie {
  contents!: Table<ContentItem>;
  records!: Table<LearningRecord>;
  sessions!: Table<TypingSession>;
  books!: Table<BookItem>;
  conversations!: Table<Conversation>;

  constructor() {
    super('echotype');
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
  }
}

export const db = new EchoTypeDB();
