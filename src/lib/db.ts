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
  }
}

export const db = new EchoTypeDB();
