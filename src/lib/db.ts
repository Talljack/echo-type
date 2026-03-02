import Dexie, { type Table } from 'dexie';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';

class EchoTypeDB extends Dexie {
  contents!: Table<ContentItem>;
  records!: Table<LearningRecord>;
  sessions!: Table<TypingSession>;

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
  }
}

export const db = new EchoTypeDB();
