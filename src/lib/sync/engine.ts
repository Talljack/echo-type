import type { SupabaseClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import type { ContentItem, LearningRecord, TypingSession } from '@/types/content';
import type { FavoriteFolder, FavoriteItem } from '@/types/favorite';

import {
  fromSupabaseContent,
  fromSupabaseFavorite,
  fromSupabaseFavoriteFolder,
  fromSupabaseRecord,
  fromSupabaseSession,
  toSupabaseContent,
  toSupabaseFavorite,
  toSupabaseFavoriteFolder,
  toSupabaseRecord,
  toSupabaseSession,
} from './mapper';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SyncResult {
  pulled: { contents: number; records: number; sessions: number; favorites: number; favoriteFolders: number };
  pushed: { contents: number; records: number; sessions: number; favorites: number; favoriteFolders: number };
  errors: string[];
}

type SyncableTable = 'contents' | 'records' | 'sessions' | 'favorites' | 'favoriteFolders';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getLastSyncedAt(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`echotype_last_synced_${userId}`);
}

function setLastSyncedAt(userId: string, iso: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`echotype_last_synced_${userId}`, iso);
}

function emptySyncResult(): SyncResult {
  return {
    pulled: { contents: 0, records: 0, sessions: 0, favorites: 0, favoriteFolders: 0 },
    pushed: { contents: 0, records: 0, sessions: 0, favorites: 0, favoriteFolders: 0 },
    errors: [],
  };
}

// ─── Sync Engine ────────────────────────────────────────────────────────────────

export class SyncEngine {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  // ── Full sync: pull everything, then push everything ────────────────────────

  async fullSync(): Promise<SyncResult> {
    const result = emptySyncResult();

    try {
      result.pulled.contents = await this.pullTable('contents');
    } catch (e) {
      result.errors.push(`Pull contents failed: ${(e as Error).message}`);
    }

    try {
      result.pulled.records = await this.pullTable('records');
    } catch (e) {
      result.errors.push(`Pull records failed: ${(e as Error).message}`);
    }

    try {
      result.pulled.sessions = await this.pullTable('sessions');
    } catch (e) {
      result.errors.push(`Pull sessions failed: ${(e as Error).message}`);
    }

    try {
      result.pulled.favorites = await this.pullTable('favorites');
    } catch (e) {
      result.errors.push(`Pull favorites failed: ${(e as Error).message}`);
    }

    try {
      result.pulled.favoriteFolders = await this.pullTable('favoriteFolders');
    } catch (e) {
      result.errors.push(`Pull favoriteFolders failed: ${(e as Error).message}`);
    }

    try {
      result.pushed.contents = await this.pushTable('contents');
    } catch (e) {
      result.errors.push(`Push contents failed: ${(e as Error).message}`);
    }

    try {
      result.pushed.records = await this.pushTable('records');
    } catch (e) {
      result.errors.push(`Push records failed: ${(e as Error).message}`);
    }

    try {
      result.pushed.sessions = await this.pushTable('sessions');
    } catch (e) {
      result.errors.push(`Push sessions failed: ${(e as Error).message}`);
    }

    try {
      result.pushed.favorites = await this.pushTable('favorites');
    } catch (e) {
      result.errors.push(`Push favorites failed: ${(e as Error).message}`);
    }

    try {
      result.pushed.favoriteFolders = await this.pushTable('favoriteFolders');
    } catch (e) {
      result.errors.push(`Push favoriteFolders failed: ${(e as Error).message}`);
    }

    setLastSyncedAt(this.userId, new Date().toISOString());
    return result;
  }

  // ── Incremental sync: only changes since last sync ──────────────────────────

  async incrementalSync(): Promise<SyncResult> {
    const result = emptySyncResult();
    const since = getLastSyncedAt(this.userId);

    // If there's no last sync timestamp, fall back to full sync
    if (!since) return this.fullSync();

    const tables: SyncableTable[] = ['contents', 'records', 'sessions', 'favorites', 'favoriteFolders'];

    for (const table of tables) {
      try {
        result.pulled[table] = await this.pullTable(table, since);
      } catch (e) {
        result.errors.push(`Pull ${table} failed: ${(e as Error).message}`);
      }
    }

    for (const table of tables) {
      try {
        result.pushed[table] = await this.pushTable(table, since);
      } catch (e) {
        result.errors.push(`Push ${table} failed: ${(e as Error).message}`);
      }
    }

    setLastSyncedAt(this.userId, new Date().toISOString());
    return result;
  }

  // ── Pull remote changes into local Dexie ────────────────────────────────────

  private async pullTable(table: SyncableTable, since?: string): Promise<number> {
    let query = this.supabase.from(table).select('*').eq('user_id', this.userId);

    if (since) {
      query = query.gt('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return 0;

    let upsertCount = 0;

    for (const row of data) {
      const remoteRecord = row as Record<string, unknown>;
      const remoteUpdatedAt = new Date(remoteRecord.updated_at as string).getTime();

      if (table === 'contents') {
        const local = await db.contents.get(remoteRecord.id as string);
        if (!local || local.updatedAt < remoteUpdatedAt) {
          const mapped = fromSupabaseContent(remoteRecord);
          await db.contents.put(mapped);
          upsertCount++;
        }
      } else if (table === 'records') {
        const local = await db.records.get(remoteRecord.id as string);
        // For records, use lastPracticed as the "updatedAt" for conflict resolution
        if (!local || local.lastPracticed < remoteUpdatedAt) {
          const mapped = fromSupabaseRecord(remoteRecord);
          await db.records.put(mapped);
          upsertCount++;
        }
      } else if (table === 'sessions') {
        const local = await db.sessions.get(remoteRecord.id as string);
        // Sessions are rarely updated; if remote exists and local doesn't, insert
        if (!local) {
          const mapped = fromSupabaseSession(remoteRecord);
          await db.sessions.put(mapped);
          upsertCount++;
        }
      } else if (table === 'favorites') {
        const local = await db.favorites.get(remoteRecord.id as string);
        if (!local || local.updatedAt < remoteUpdatedAt) {
          const mapped = fromSupabaseFavorite(remoteRecord);
          await db.favorites.put(mapped);
          upsertCount++;
        }
      } else if (table === 'favoriteFolders') {
        const local = await db.favoriteFolders.get(remoteRecord.id as string);
        const remoteCreatedAt = new Date(remoteRecord.created_at as string).getTime();
        // Folders have no updatedAt; use createdAt for conflict resolution
        if (!local || local.createdAt < remoteCreatedAt) {
          const mapped = fromSupabaseFavoriteFolder(remoteRecord);
          await db.favoriteFolders.put(mapped);
          upsertCount++;
        }
      }
    }

    return upsertCount;
  }

  // ── Push local changes to remote Supabase ───────────────────────────────────

  private async pushTable(table: SyncableTable, since?: string): Promise<number> {
    const sinceTs = since ? new Date(since).getTime() : 0;

    let localRecords: Array<ContentItem | LearningRecord | TypingSession | FavoriteItem | FavoriteFolder>;

    if (table === 'contents') {
      localRecords = since
        ? await db.contents.where('updatedAt').above(sinceTs).toArray()
        : await db.contents.toArray();
    } else if (table === 'records') {
      localRecords = since
        ? await db.records.where('lastPracticed').above(sinceTs).toArray()
        : await db.records.toArray();
    } else if (table === 'sessions') {
      localRecords = since
        ? await db.sessions.where('startTime').above(sinceTs).toArray()
        : await db.sessions.toArray();
    } else if (table === 'favorites') {
      localRecords = since
        ? await db.favorites.where('updatedAt').above(sinceTs).toArray()
        : await db.favorites.toArray();
    } else {
      localRecords = since
        ? await db.favoriteFolders.where('createdAt').above(sinceTs).toArray()
        : await db.favoriteFolders.toArray();
    }

    if (localRecords.length === 0) return 0;

    // Map to Supabase format
    const mapped = localRecords.map((record) => {
      if (table === 'contents') return toSupabaseContent(record as ContentItem, this.userId);
      if (table === 'records') return toSupabaseRecord(record as LearningRecord, this.userId);
      if (table === 'favorites') return toSupabaseFavorite(record as FavoriteItem, this.userId);
      if (table === 'favoriteFolders') return toSupabaseFavoriteFolder(record as FavoriteFolder, this.userId);
      return toSupabaseSession(record as TypingSession, this.userId);
    });

    // Upsert in batches of 100
    const BATCH_SIZE = 100;
    let pushCount = 0;

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      const { error } = await this.supabase.from(table).upsert(batch, { onConflict: 'id' });

      if (error) {
        throw new Error(error.message);
      }
      pushCount += batch.length;
    }

    return pushCount;
  }
}
