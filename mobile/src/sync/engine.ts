import { database } from '@/database';
import type { Book } from '@/database/models/Book';
import type { Content } from '@/database/models/Content';
import type { LearningRecord } from '@/database/models/LearningRecord';
import { supabase } from '@/services/supabase';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  error?: string;
}

export class SyncEngine {
  private isSyncing = false;

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, error: 'Sync already in progress' };
    }

    this.isSyncing = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      let synced = 0;
      let failed = 0;

      // Sync contents
      const contentsResult = await this.syncContents(session.user.id);
      synced += contentsResult.synced;
      failed += contentsResult.failed;

      // Sync learning records
      const recordsResult = await this.syncLearningRecords(session.user.id);
      synced += recordsResult.synced;
      failed += recordsResult.failed;

      // Sync books
      const booksResult = await this.syncBooks(session.user.id);
      synced += booksResult.synced;
      failed += booksResult.failed;

      return { success: failed === 0, synced, failed };
    } catch (error) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncContents(userId: string): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      // Pull from Supabase
      const { data: remoteContents, error } = await supabase.from('contents').select('*').eq('user_id', userId);

      if (error) throw error;

      // Update local database
      await database.write(async () => {
        const contentsCollection = database.get<Content>('contents');

        for (const remoteContent of remoteContents || []) {
          try {
            const existingContent = await contentsCollection.find(remoteContent.id);

            await existingContent.update((content) => {
              Object.assign(content, {
                title: remoteContent.title,
                text: remoteContent.text,
                translation: remoteContent.translation,
                type: remoteContent.type,
                difficulty: remoteContent.difficulty,
                audioUrl: remoteContent.audio_url,
                metadata: remoteContent.metadata,
                updatedAt: new Date(remoteContent.updated_at),
              });
            });
            synced++;
          } catch {
            // Content doesn't exist locally, create it
            try {
              await contentsCollection.create((content) => {
                Object.assign(content, {
                  id: remoteContent.id,
                  title: remoteContent.title,
                  text: remoteContent.text,
                  translation: remoteContent.translation,
                  type: remoteContent.type,
                  difficulty: remoteContent.difficulty,
                  audioUrl: remoteContent.audio_url,
                  metadata: remoteContent.metadata,
                  createdAt: new Date(remoteContent.created_at),
                  updatedAt: new Date(remoteContent.updated_at),
                });
              });
              synced++;
            } catch {
              failed++;
            }
          }
        }
      });
    } catch {
      failed++;
    }

    return { synced, failed };
  }

  private async syncLearningRecords(userId: string): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      // Get local records that need syncing
      const localRecords = await database.get<LearningRecord>('learning_records').query().fetch();

      // Push to Supabase
      for (const record of localRecords) {
        try {
          const { error } = await supabase.from('learning_records').upsert({
            id: record.id,
            user_id: userId,
            content_id: record.contentId,
            stability: record.stability,
            difficulty: record.difficulty,
            elapsed_days: record.elapsedDays,
            scheduled_days: record.scheduledDays,
            reps: record.reps,
            lapses: record.lapses,
            state: record.state,
            last_review: record.lastReview?.toISOString(),
            due_date: record.dueDate?.toISOString(),
            created_at: record.createdAt.toISOString(),
            updated_at: record.updatedAt.toISOString(),
          });

          if (error) throw error;
          synced++;
        } catch {
          failed++;
        }
      }
    } catch {
      failed++;
    }

    return { synced, failed };
  }

  private async syncBooks(userId: string): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      // Pull from Supabase
      const { data: remoteBooks, error } = await supabase.from('books').select('*').eq('user_id', userId);

      if (error) throw error;

      // Update local database
      await database.write(async () => {
        const booksCollection = database.get<Book>('books');

        for (const remoteBook of remoteBooks || []) {
          try {
            const existingBook = await booksCollection.find(remoteBook.id);

            await existingBook.update((book) => {
              Object.assign(book, {
                title: remoteBook.title,
                author: remoteBook.author,
                coverUrl: remoteBook.cover_url,
                description: remoteBook.description,
                metadata: remoteBook.metadata,
                updatedAt: new Date(remoteBook.updated_at),
              });
            });
            synced++;
          } catch {
            // Book doesn't exist locally, create it
            try {
              await booksCollection.create((book) => {
                Object.assign(book, {
                  id: remoteBook.id,
                  title: remoteBook.title,
                  author: remoteBook.author,
                  coverUrl: remoteBook.cover_url,
                  description: remoteBook.description,
                  metadata: remoteBook.metadata,
                  createdAt: new Date(remoteBook.created_at),
                  updatedAt: new Date(remoteBook.updated_at),
                });
              });
              synced++;
            } catch {
              failed++;
            }
          }
        }
      });
    } catch {
      failed++;
    }

    return { synced, failed };
  }

  async pullChanges(): Promise<SyncResult> {
    return this.sync();
  }

  async pushChanges(): Promise<SyncResult> {
    // For now, push is handled within sync()
    return this.sync();
  }
}

export const syncEngine = new SyncEngine();
